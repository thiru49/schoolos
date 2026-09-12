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

type Section = { id: string; classId: string; label: string };
type Student = {
  id: string;
  admissionNumber: string;
  fullName: string;
  classId: string;
  sectionId: string;
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
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Student | null>(null);
  const [editName, setEditName] = useState("");
  const [editSectionId, setEditSectionId] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [createSectionId, setCreateSectionId] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const list = await api().students.list({ sectionId: sectionId || undefined, q: q || undefined });
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
      setMessage(e instanceof Error ? e.message : "Failed to load students");
    }
  }, [q, sectionId]);

  useEffect(() => {
    api()
      .academics.sections()
      .then((list) => {
        setSections(list);
        if (list[0]) setCreateSectionId(list[0].id);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 403) {
          setState("denied");
          setMessage(e.message);
        }
      });
  }, []);

  useEffect(() => {
    void load();
    // Filter changes: section is applied immediately; search uses the Search button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function saveEdit() {
    if (!selected) return;
    const section = sections.find((s) => s.id === editSectionId);
    try {
      await api().students.update(selected.id, {
        fullName: editName,
        classId: section?.classId,
        sectionId: section?.id,
      });
      toast.success("Student updated");
      setSelected(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  if (state === "denied") {
    return <PermissionDenied detail={message || "You cannot view students."} />;
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

      {state === "loading" ? (
        <div className="mt-6 space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}
      {state === "offline" || state === "error" ? (
        <div className="mt-6">
          <ErrorState message={message} onRetry={() => void load()} />
        </div>
      ) : null}
      {state === "empty" ? (
        <div className="mt-6">
          <EmptyState title="No students" detail="No students match this filter." />
        </div>
      ) : null}
      {state === "loaded" ? (
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
              <tr
                key={r.id}
                className="cursor-pointer border-t hover:bg-slate-50"
                onClick={() => {
                  setSelected(r);
                  setEditName(r.fullName);
                  setEditSectionId(r.sectionId);
                }}
              >
                <td className="px-4 py-2">{r.admissionNumber}</td>
                <td className="px-4 py-2">{r.fullName}</td>
                <td className="px-4 py-2">{r.label}</td>
                <td className="px-4 py-2">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {selected ? (
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
          <p className="font-display text-lg text-primary">Student detail</p>
          <p className="text-sm text-slate-500">{selected.admissionNumber}</p>
          {canWrite ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              <select className="h-10 rounded-lg border px-3 text-sm" value={editSectionId} onChange={(e) => setEditSectionId(e.target.value)}>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button onClick={() => void saveEdit()}>Save</Button>
                <Button variant="secondary" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
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
