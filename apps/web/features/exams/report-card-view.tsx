"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { getAccessToken } from "../../lib/session";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import { Skeleton } from "../../components/ui/skeleton";

type Card = {
  schoolName: string;
  studentName: string;
  classSection: string;
  academicYear: string;
  studentId: string;
  rows: { exam: string; subject: string; score: number; maxScore: number }[];
};
type Student = { id: string; fullName: string; admissionNumber: string; label: string };

export function ReportCardView() {
  const { acl } = useAppBranding();
  const canStaff = acl.permissions.includes(PERMISSIONS.REPORTS_PROGRESS);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [card, setCard] = useState<Card | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (canStaff && !studentId) {
      setState("empty");
      return;
    }
    setState("loading");
    setMessage("");
    try {
      const data = await api().exams.reportCard(studentId || undefined);
      setCard(data);
      setState(data.rows.length === 0 ? "empty" : "loaded");
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
      setMessage(e instanceof Error ? e.message : "Failed to load report card");
    }
  }, [canStaff, studentId]);

  useEffect(() => {
    if (canStaff) {
      api()
        .students.list()
        .then((list) => {
          setStudents(list);
          if (list[0]) setStudentId(list[0].id);
        })
        .catch(() => undefined);
    }
  }, [canStaff]);

  useEffect(() => {
    void load();
  }, [load]);

  async function downloadPdf() {
    try {
      await api().exams.enqueueReportCardPdf(studentId || undefined);
      toast.success("PDF queued");
      const token = getAccessToken();
      const path = api().exams.reportCardPdfUrl(studentId || undefined);
      for (let i = 0; i < 10; i++) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}${path}`, {
          headers: { Authorization: `Bearer ${token ?? ""}` },
        });
        if (res.status === 202) {
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }
        if (!res.ok) throw new Error("PDF download failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "report-card.pdf";
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      toast.error("PDF is still generating");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF failed");
    }
  }

  if (state === "denied") {
    return <PermissionDenied detail={message || "You cannot view this report card."} />;
  }

  return (
    <div>
      {canStaff ? (
        <select className="h-10 rounded-lg border px-3 text-sm" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.admissionNumber} {s.fullName}
            </option>
          ))}
        </select>
      ) : null}
      {state === "loading" ? (
        <div className="mt-6">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : null}
      {state === "offline" || state === "error" ? (
        <div className="mt-6">
          <ErrorState message={message} onRetry={() => void load()} />
        </div>
      ) : null}
      {state === "empty" ? (
        <div className="mt-6">
          <EmptyState title="No published marks" detail="A report card appears after marks are published for this academic year." />
        </div>
      ) : null}
      {state === "loaded" && card ? (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <p className="font-display text-xl text-primary">{card.schoolName}</p>
          <p className="mt-2 text-sm">{card.studentName}</p>
          <p className="text-sm text-slate-500">
            {card.classSection} · {card.academicYear}
          </p>
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr>
                <th className="py-2">Exam</th>
                <th>Subject</th>
                <th>Score</th>
                <th>Max</th>
              </tr>
            </thead>
            <tbody>
              {card.rows.map((r) => (
                <tr key={`${r.exam}-${r.subject}`} className="border-t">
                  <td className="py-2">{r.exam}</td>
                  <td>{r.subject}</td>
                  <td>{r.score}</td>
                  <td>{r.maxScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button className="mt-4" onClick={() => void downloadPdf()}>
            Download PDF
          </Button>
        </div>
      ) : null}
    </div>
  );
}
