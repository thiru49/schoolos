"use client";

import { useEffect, useState } from "react";
import { PERMISSIONS } from "@schoolos/permissions";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";

type Section = { id: string; classId: string; label: string };
type Student = {
  id: string;
  admissionNumber: string;
  fullName: string;
  label: string;
  status: string;
};

export function StudentsBoard() {
  const { acl } = useAppBranding();
  const canWrite = acl.permissions.includes(PERMISSIONS.STUDENTS_WRITE);
  const [sections, setSections] = useState<Section[]>([]);
  const [rows, setRows] = useState<Student[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [createSectionId, setCreateSectionId] = useState("");

  async function load() {
    try {
      setRows(await api().students.list({ sectionId: sectionId || undefined, q: q || undefined }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load students");
    }
  }

  useEffect(() => {
    api()
      .academics.sections()
      .then((list) => {
        setSections(list);
        if (list[0]) setCreateSectionId(list[0].id);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    void load();
  }, [sectionId]);

  async function create() {
    const section = sections.find((s) => s.id === createSectionId);
    if (!section) return;
    try {
      await api().students.create({
        admissionNumber,
        fullName,
        classId: section.classId,
        sectionId: section.id,
        password,
      });
      toast.success("Student created");
      setAdmissionNumber("");
      setFullName("");
      setPassword("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <select className="h-10 rounded-lg border px-3 text-sm" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          <option value="">All in scope</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <Input placeholder="Search name or admission no." value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="secondary" onClick={() => void load()}>
          Search
        </Button>
      </div>
      {error ? <div className="mt-6"><ErrorState message={error} onRetry={() => void load()} /></div> : null}
      {canWrite ? (
        <div className="mt-6 grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-5">
          <Input placeholder="Admission no." value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} />
          <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <select className="h-10 rounded-lg border px-3 text-sm" value={createSectionId} onChange={(e) => setCreateSectionId(e.target.value)}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <Input type="password" placeholder="Login password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button onClick={() => void create()}>Add student</Button>
        </div>
      ) : null}
      {rows.length === 0 && !error ? (
        <div className="mt-6">
          <EmptyState title="No students" detail="No students match this filter." />
        </div>
      ) : (
        <table className="mt-6 w-full overflow-hidden rounded-2xl bg-white text-left text-sm shadow-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-4 py-2">Admission</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.admissionNumber}</td>
                <td className="px-4 py-2">{r.fullName}</td>
                <td className="px-4 py-2">{r.label}</td>
                <td className="px-4 py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
