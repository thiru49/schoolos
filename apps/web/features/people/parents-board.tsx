"use client";

import { useEffect, useState } from "react";
import { PERMISSIONS } from "@schoolos/permissions";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/states/empty-state";

type Parent = {
  id: string;
  fullName: string;
  contact: string | null;
  children: { studentId: string; fullName: string; admissionNumber: string }[];
};

export function ParentsBoard() {
  const { acl } = useAppBranding();
  const canWrite = acl.permissions.includes(PERMISSIONS.PARENTS_WRITE);
  const [rows, setRows] = useState<Parent[]>([]);
  const [students, setStudents] = useState<{ id: string; fullName: string; admissionNumber: string }[]>([]);
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [studentId, setStudentId] = useState("");

  async function load() {
    setRows(await api().parents.list());
  }

  useEffect(() => {
    void load();
    api()
      .students.list()
      .then((list) => {
        setStudents(list);
        if (list[0]) setStudentId(list[0].id);
      })
      .catch(() => undefined);
  }, []);

  async function create() {
    try {
      await api().parents.create({
        fullName,
        contact,
        password,
        studentIds: studentId ? [studentId] : [],
      });
      toast.success("Parent created");
      setFullName("");
      setContact("");
      setPassword("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    }
  }

  return (
    <div>
      {canWrite ? (
        <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-5">
          <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input placeholder="Contact / login id" value={contact} onChange={(e) => setContact(e.target.value)} />
          <Input type="password" placeholder="Login password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <select className="h-10 rounded-lg border px-3 text-sm" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">No child yet</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.admissionNumber} {s.fullName}
              </option>
            ))}
          </select>
          <Button onClick={() => void create()}>Add parent</Button>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No parents" detail="No parent records in this school." />
        </div>
      ) : (
        <table className="mt-6 w-full overflow-hidden rounded-2xl bg-white text-left text-sm shadow-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Children</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.fullName}</td>
                <td className="px-4 py-2">{r.contact}</td>
                <td className="px-4 py-2">{r.children.map((c) => c.fullName).join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
