"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
type Subject = { id: string; name: string };
type Exam = { id: string; name: string; examDate: string; maxScore: number; subjectName: string; label: string };

export function ExamsBoard() {
  const { acl } = useAppBranding();
  const canWrite = acl.permissions.includes(PERMISSIONS.EXAMS_WRITE);
  const canPublish = acl.permissions.includes(PERMISSIONS.MARKS_PUBLISH);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [rows, setRows] = useState<Exam[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState(todayIso());
  const [maxScore, setMaxScore] = useState("100");
  const [subjectId, setSubjectId] = useState("");

  const load = useCallback(async () => {
    if (!sectionId) return;
    setState("loading");
    setMessage("");
    try {
      const list = await api().exams.list({ sectionId });
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
      setMessage(e instanceof Error ? e.message : "Failed to load exams");
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
    api()
      .subjects.list()
      .then((list) => {
        setSubjects(list);
        if (list[0]) setSubjectId(list[0].id);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (sectionId) void load();
  }, [sectionId, load]);

  const section = sections.find((s) => s.id === sectionId);

  if (state === "denied") {
    return <PermissionDenied detail={message || "You cannot view exams for this section."} />;
  }

  return (
    <div>
      <div className="flex gap-3">
        <select className="h-10 rounded-lg border px-3 text-sm" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        {canPublish ? (
          <Link href="/exams/queue">
            <Button variant="secondary">Publish queue</Button>
          </Link>
        ) : null}
      </div>
      {canWrite ? (
        <div className="mt-4 grid gap-2 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-5">
          <Input placeholder="Exam name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          <Input value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
          <select className="h-10 rounded-lg border px-3 text-sm" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button
            onClick={async () => {
              if (!section) return;
              try {
                await api().exams.create({
                  classId: section.classId,
                  sectionId: section.id,
                  subjectId,
                  name,
                  examDate,
                  maxScore: Number(maxScore),
                });
                toast.success("Exam created");
                setName("");
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Create failed");
              }
            }}
          >
            Create exam
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
          <EmptyState title="No exams" detail="Create an exam for this section first." />
        </div>
      ) : null}
      {state === "loaded" ? (
        <table className="mt-6 w-full overflow-hidden rounded-2xl bg-white text-left text-sm shadow-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-4 py-2">Exam</th>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Max</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.subjectName}</td>
                <td className="px-4 py-2">{r.examDate}</td>
                <td className="px-4 py-2">{r.maxScore}</td>
                <td className="px-4 py-2">
                  <Link href={`/exams/${r.id}`} className="text-primary">
                    Marks
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
