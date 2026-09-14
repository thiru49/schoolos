"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import { Skeleton } from "../../components/ui/skeleton";

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
  const [q, setQ] = useState("");
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Parent | null>(null);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [linkStudentId, setLinkStudentId] = useState("");
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const list = await api().parents.list(q || undefined);
      setRows(list);
      setState(list.length === 0 ? "empty" : "loaded");
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setState("denied");
        setMessage(e.message);
        return;
      }
      if (e instanceof TypeError) {
        setState("offline");
        setMessage("You appear to be offline.");
        return;
      }
      setState("error");
      setMessage(e instanceof Error ? e.message : "Failed to load parents");
    }
  }, [q]);

  useEffect(() => {
    void load();
    api()
      .students.list()
      .then((list) => {
        setStudents(list);
        if (list[0]) {
          setStudentId(list[0].id);
          setLinkStudentId(list[0].id);
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    if (savingCreate) return;
    setSavingCreate(true);
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
    } finally {
      setSavingCreate(false);
    }
  }

  async function saveEdit() {
    if (!selected || savingEdit) return;
    setSavingEdit(true);
    try {
      await api().parents.update(selected.id, { fullName: editName, contact: editContact });
      toast.success("Parent updated");
      const next = await api().parents.get(selected.id);
      setSelected(next);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function link() {
    if (!selected || !linkStudentId) return;
    try {
      const next = await api().parents.link(selected.id, linkStudentId);
      setSelected(next as Parent);
      toast.success("Child linked");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Link failed");
    }
  }

  async function unlink(studentIdToRemove: string) {
    if (!selected) return;
    try {
      const next = await api().parents.unlink(selected.id, studentIdToRemove);
      setSelected(next as Parent);
      toast.success("Child unlinked");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unlink failed");
    }
  }

  if (state === "denied") {
    return <PermissionDenied detail={message || "You cannot view parents."} />;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search name or contact" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="secondary" onClick={() => void load()}>
          Search
        </Button>
      </div>
      {canWrite ? (
        <div className="mt-6 grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-5">
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
          <Button disabled={savingCreate} onClick={() => void create()}>
            {savingCreate ? "Saving…" : "Add parent"}
          </Button>
        </div>
      ) : null}

      {state === "loading" ? (
        <div className="mt-6">
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}
      {state === "offline" || state === "error" ? (
        <div className="mt-6">
          <ErrorState message={message} onRetry={() => void load()} />
        </div>
      ) : null}
      {state === "empty" ? (
        <div className="mt-6">
          <EmptyState title="No parents" detail="No parent records in this school." />
        </div>
      ) : null}
      {state === "loaded" ? (
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
              <tr
                key={r.id}
                className="cursor-pointer border-t hover:bg-slate-50"
                onClick={() => {
                  setSelected(r);
                  setEditName(r.fullName);
                  setEditContact(r.contact ?? "");
                }}
              >
                <td className="px-4 py-2">{r.fullName}</td>
                <td className="px-4 py-2">{r.contact}</td>
                <td className="px-4 py-2">{r.children.map((c) => c.fullName).join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {selected ? (
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
          <p className="font-display text-lg text-primary">Parent detail</p>
          {canWrite ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              <Input value={editContact} onChange={(e) => setEditContact(e.target.value)} />
              <div className="flex gap-2">
                <Button disabled={savingEdit} onClick={() => void saveEdit()}>
                  {savingEdit ? "Saving…" : "Save"}
                </Button>
                <Button variant="secondary" disabled={savingEdit} onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <Button className="mt-4" variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
          )}
          <p className="mt-4 text-sm font-medium">Linked children</p>
          <ul className="mt-2 space-y-2 text-sm">
            {selected.children.map((c) => (
              <li key={c.studentId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span>
                  {c.admissionNumber} {c.fullName}
                </span>
                {canWrite ? (
                  <Button size="sm" variant="secondary" onClick={() => void unlink(c.studentId)}>
                    Unlink
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          {canWrite ? (
            <div className="mt-3 flex gap-2">
              <select className="h-10 rounded-lg border px-3 text-sm" value={linkStudentId} onChange={(e) => setLinkStudentId(e.target.value)}>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.admissionNumber} {s.fullName}
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={() => void link()}>
                Link child
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
