"use client";

import { useEffect, useState } from "react";
import { PERMISSIONS } from "@schoolos/permissions";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { todayIso } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";

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
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState(todayIso());

  async function load() {
    try {
      setRows(await api().homework.list({ sectionId: sectionId || undefined }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load homework");
    }
  }

  useEffect(() => {
    api()
      .academics.sections()
      .then((list) => {
        setSections(list);
        if (list[0]) setSectionId(list[0].id);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (sectionId) void load();
  }, [sectionId]);

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
      {error ? <div className="mt-6"><ErrorState message={error} onRetry={() => void load()} /></div> : null}
      {rows.length === 0 && !error ? (
        <div className="mt-6">
          <EmptyState title="No homework" detail="No assignments for this section." />
        </div>
      ) : (
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
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.title}</td>
                <td className="px-4 py-2">{r.dueDate}</td>
                <td className="px-4 py-2">{r.label}</td>
                <td className="px-4 py-2">{r.completionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
