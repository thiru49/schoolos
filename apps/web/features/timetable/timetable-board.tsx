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

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Section = { id: string; classId: string; label: string };
type Period = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  published: boolean;
  subjectName: string;
  teacherName: string;
};
type Subject = { id: string; name: string };
type Teacher = { id: string; fullName: string; employeeId: string };

export function TimetableBoard() {
  const { acl } = useAppBranding();
  const canWrite = acl.permissions.includes(PERMISSIONS.TIMETABLE_WRITE);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:45");

  async function load() {
    if (!sectionId) return;
    try {
      setPeriods(await api().timetable.list({ sectionId }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load timetable");
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
    api()
      .subjects.list()
      .then((list) => {
        setSubjects(list);
        if (list[0]) setSubjectId(list[0].id);
      })
      .catch(() => undefined);
    api()
      .teachers.list()
      .then((list) => {
        setTeachers(list);
        if (list[0]) setTeacherId(list[0].id);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void load();
  }, [sectionId]);

  const section = sections.find((s) => s.id === sectionId);

  return (
    <div>
      <select className="h-10 rounded-lg border px-3 text-sm" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {canWrite ? (
        <div className="mt-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex gap-2">
            <Input placeholder="New subject" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  const s = await api().subjects.create(subjectName);
                  setSubjects((prev) => [...prev, s]);
                  setSubjectId(s.id);
                  setSubjectName("");
                  toast.success("Subject added");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Subject failed");
                }
              }}
            >
              Add subject
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-6">
            <select className="h-10 rounded-lg border px-3 text-sm" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
              {DAYS.slice(1).map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </select>
            <Input value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <Input value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            <select className="h-10 rounded-lg border px-3 text-sm" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select className="h-10 rounded-lg border px-3 text-sm" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
            <Button
              onClick={async () => {
                if (!section) return;
                try {
                  await api().timetable.create({
                    classId: section.classId,
                    sectionId: section.id,
                    subjectId,
                    teacherId,
                    weekday,
                    startTime,
                    endTime,
                  });
                  toast.success("Period saved");
                  await load();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Save failed");
                }
              }}
            >
              Add period
            </Button>
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                const r = await api().timetable.publish(sectionId);
                toast.success(`Published ${r.published} periods`);
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Publish failed");
              }
            }}
          >
            Publish section timetable
          </Button>
        </div>
      ) : null}
      {error ? <div className="mt-6"><ErrorState message={error} onRetry={() => void load()} /></div> : null}
      {periods.length === 0 && !error ? (
        <div className="mt-6">
          <EmptyState title="No periods" detail="No timetable rows for this section." />
        </div>
      ) : (
        <table className="mt-6 w-full overflow-hidden rounded-2xl bg-white text-left text-sm shadow-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-4 py-2">Day</th>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">Teacher</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">{DAYS[p.weekday]}</td>
                <td className="px-4 py-2">
                  {p.startTime}–{p.endTime}
                </td>
                <td className="px-4 py-2">{p.subjectName}</td>
                <td className="px-4 py-2">{p.teacherName}</td>
                <td className="px-4 py-2">{p.published ? "Published" : "Draft"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
