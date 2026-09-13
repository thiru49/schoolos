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

type Row = { studentId: string; fullName: string; admissionNumber: string; score: number | null; status: string | null };

export function MarksEntry({ examId }: { examId: string }) {
  const { acl } = useAppBranding();
  const canDraft = acl.permissions.includes(PERMISSIONS.MARKS_DRAFT);
  const canSubmit = acl.permissions.includes(PERMISSIONS.MARKS_SUBMIT);
  const canPublish = acl.permissions.includes(PERMISSIONS.MARKS_PUBLISH);
  const [title, setTitle] = useState("");
  const [maxScore, setMaxScore] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const data = await api().exams.marks(examId);
      setTitle(`${data.exam.name} · ${data.exam.subjectName}`);
      setMaxScore(data.exam.maxScore);
      setRows(data.rows);
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
      setMessage(e instanceof Error ? e.message : "Failed to load marks");
    }
  }, [examId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "denied") {
    return <PermissionDenied detail={message || "You cannot enter marks for this exam."} />;
  }
  if (state === "loading") {
    return <Skeleton className="h-40 w-full" />;
  }
  if (state === "offline" || state === "error") {
    return <ErrorState message={message} onRetry={() => void load()} />;
  }
  if (state === "empty") {
    return <EmptyState title="No students" detail="No roster for this exam section." />;
  }

  return (
    <div>
      <p className="text-sm text-slate-500">{title} (max {maxScore})</p>
      <table className="mt-4 w-full overflow-hidden rounded-2xl bg-white text-left text-sm shadow-sm">
        <thead className="bg-primary text-white">
          <tr>
            <th className="px-4 py-2">Admission</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Score</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.studentId} className="border-t">
              <td className="px-4 py-2">{r.admissionNumber}</td>
              <td className="px-4 py-2">{r.fullName}</td>
              <td className="px-4 py-2">
                {canDraft && r.status !== "published" && r.status !== "submitted" ? (
                  <Input
                    value={r.score == null ? "" : String(r.score)}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((row) =>
                          row.studentId === r.studentId
                            ? { ...row, score: e.target.value === "" ? null : Number(e.target.value) }
                            : row,
                        ),
                      )
                    }
                  />
                ) : (
                  r.score ?? "—"
                )}
              </td>
              <td className="px-4 py-2">{r.status ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex gap-2">
        {canDraft ? (
          <Button
            onClick={async () => {
              try {
                await api().exams.draft(
                  examId,
                  rows.filter((r) => r.score != null).map((r) => ({ studentId: r.studentId, score: r.score as number })),
                );
                toast.success("Draft saved");
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Draft failed");
              }
            }}
          >
            Save draft
          </Button>
        ) : null}
        {canSubmit ? (
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                const r = await api().exams.submit(examId);
                toast.success(`Submitted ${r.submitted}`);
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Submit failed");
              }
            }}
          >
            Submit for publish
          </Button>
        ) : null}
        {canPublish ? (
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                const r = await api().exams.publish(examId);
                toast.success(`Published ${r.published}`);
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Publish failed");
              }
            }}
          >
            Publish
          </Button>
        ) : null}
      </div>
    </div>
  );
}
