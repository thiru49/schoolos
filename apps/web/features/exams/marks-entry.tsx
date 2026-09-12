"use client";

import { useEffect, useState } from "react";
import { PERMISSIONS } from "@schoolos/permissions";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/states/empty-state";

type Row = { studentId: string; fullName: string; admissionNumber: string; score: number | null; status: string | null };

export function MarksEntry({ examId }: { examId: string }) {
  const { acl } = useAppBranding();
  const canDraft = acl.permissions.includes(PERMISSIONS.MARKS_DRAFT);
  const canSubmit = acl.permissions.includes(PERMISSIONS.MARKS_SUBMIT);
  const canPublish = acl.permissions.includes(PERMISSIONS.MARKS_PUBLISH);
  const [title, setTitle] = useState("");
  const [maxScore, setMaxScore] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    const data = await api().exams.marks(examId);
    setTitle(`${data.exam.name} · ${data.exam.subjectName}`);
    setMaxScore(data.exam.maxScore);
    setRows(data.rows);
  }

  useEffect(() => {
    void load();
  }, [examId]);

  if (rows.length === 0) {
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
