"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { todayIso } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import { Skeleton } from "../../components/ui/skeleton";

type Section = { id: string; classId: string; label: string };
type Row = {
  id: string;
  title: string;
  body: string;
  dueDate: string;
  label: string;
  completionCount: number;
};

export function HomeworkBoard() {
  const { acl } = useAppBranding();
  const canCreate = acl.permissions.includes(PERMISSIONS.HOMEWORK_CREATE);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState(todayIso());
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editDue, setEditDue] = useState("");

  const load = useCallback(async () => {
    if (!sectionId) return;
    setState("loading");
    setMessage("");
    try {
      const list = await api().homework.list({ sectionId });
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
      setMessage(e instanceof Error ? e.message : "Failed to load homework");
    }
  }, [sectionId]);

  useEffect(() => {
    api()
      .academics.sections()
      .then((list) => {
        setSections(list);
        if (list[0]) setSectionId(list[0].id);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 403) {
          setState("denied");
          setMessage(e.message);
        } else {
          setState("error");
          setMessage(e instanceof Error ? e.message : "Failed to load sections");
        }
      });
  }, []);

  useEffect(() => {
    if (sectionId) void load();
  }, [sectionId, load]);

  async function create() {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    try {
      await api().homework.create({
        classId: section.classId,
        sectionId: section.id,
        title,
        body,
        dueDate,
      });
      toast.success("Homework saved");
      setTitle("");
      setBody("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    }
  }

  async function saveEdit() {
    if (!selected) return;
    try {
      await api().homework.update(selected.id, { title: editTitle, body: editBody, dueDate: editDue });
      toast.success("Homework updated");
      setSelected(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  if (state === "denied") {
    return <PermissionDenied detail={message || "You cannot view homework for this section."} />;
  }

  return (
    <div>
      <select className="h-10 rounded-lg border px-3 text-sm" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {canCreate ? (
        <div className="mt-4 grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-2">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <Input className="md:col-span-2" placeholder="Instructions" value={body} onChange={(e) => setBody(e.target.value)} />
          <Button onClick={() => void create()}>Create homework</Button>
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
          <EmptyState title="No homework" detail="No assignments for this section." />
        </div>
      ) : null}
      {state === "loaded" ? (
        <table className="mt-6 w-full overflow-hidden rounded-2xl bg-white text-left text-sm shadow-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Due</th>
              <th className="px-4 py-2">Section</th>
              <th className="px-4 py-2">Completed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer border-t hover:bg-slate-50"
                onClick={() => {
                  setSelected(r);
                  setEditTitle(r.title);
                  setEditBody(r.body);
                  setEditDue(r.dueDate);
                }}
              >
                <td className="px-4 py-2">{r.title}</td>
                <td className="px-4 py-2">{r.dueDate}</td>
                <td className="px-4 py-2">{r.label}</td>
                <td className="px-4 py-2">{r.completionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {selected ? (
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
          <p className="font-display text-lg text-primary">Homework detail</p>
          {canCreate ? (
            <div className="mt-4 grid gap-3">
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              <Input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} />
              <Input value={editBody} onChange={(e) => setEditBody(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={() => void saveEdit()}>Save</Button>
                <Button variant="secondary" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm">
              <p>{selected.body}</p>
              <Button className="mt-4" variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
