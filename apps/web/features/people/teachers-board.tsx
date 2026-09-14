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

type Teacher = { id: string; employeeId: string; fullName: string; sections: string[] };
type Section = { id: string; classId: string; label: string };

export function TeachersBoard() {
  const { acl } = useAppBranding();
  const canWrite = acl.permissions.includes(PERMISSIONS.TEACHERS_WRITE);
  const [rows, setRows] = useState<Teacher[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [q, setQ] = useState("");
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Teacher | null>(null);
  const [editName, setEditName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const list = await api().teachers.list(q || undefined);
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
      setMessage(e instanceof Error ? e.message : "Failed to load teachers");
    }
  }, [q]);

  useEffect(() => {
    void load();
    api()
      .academics.sections()
      .then((list) => {
        setSections(list);
        if (list[0]) setSectionId(list[0].id);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sectionLabel(id: string) {
    return sections.find((s) => s.id === id)?.label ?? id;
  }

  async function create() {
    if (savingCreate) return;
    const section = sections.find((s) => s.id === sectionId);
    setSavingCreate(true);
    try {
      await api().teachers.create({
        employeeId,
        fullName,
        password,
        classId: section?.classId,
        sectionId: section?.id,
      });
      toast.success("Teacher created");
      setEmployeeId("");
      setFullName("");
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
      await api().teachers.update(selected.id, { fullName: editName });
      toast.success("Teacher updated");
      setSelected(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  if (state === "denied") {
    return <PermissionDenied detail={message || "You cannot view teachers."} />;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search name or employee ID" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="secondary" onClick={() => void load()}>
          Search
        </Button>
      </div>
      {canWrite ? (
        <div className="mt-6 grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-5">
          <Input placeholder="Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
          <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <select className="h-10 rounded-lg border px-3 text-sm" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <Input type="password" placeholder="Login password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button disabled={savingCreate} onClick={() => void create()}>
            {savingCreate ? "Saving…" : "Add teacher"}
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
          <EmptyState title="No teachers" detail="No staff records in this school." />
        </div>
      ) : null}
      {state === "loaded" ? (
        <table className="mt-6 w-full overflow-hidden rounded-2xl bg-white text-left text-sm shadow-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-4 py-2">Employee ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Assignments</th>
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
                }}
              >
                <td className="px-4 py-2">{r.employeeId}</td>
                <td className="px-4 py-2">{r.fullName}</td>
                <td className="px-4 py-2">{r.sections.map(sectionLabel).join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {selected ? (
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
          <p className="font-display text-lg text-primary">Teacher detail</p>
          <p className="text-sm text-slate-500">{selected.employeeId}</p>
          <p className="mt-2 text-sm">Assignments: {selected.sections.map(sectionLabel).join(", ") || "—"}</p>
          {canWrite ? (
            <div className="mt-4 flex gap-2">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              <Button disabled={savingEdit} onClick={() => void saveEdit()}>
                {savingEdit ? "Saving…" : "Save"}
              </Button>
              <Button variant="secondary" disabled={savingEdit} onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          ) : (
            <Button className="mt-4" variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
