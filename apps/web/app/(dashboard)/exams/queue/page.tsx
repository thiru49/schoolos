"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "../../../../lib/api";
import { AppHeader } from "../../../../components/shell/app-header";
import { Button } from "../../../../components/ui/button";
import { EmptyState } from "../../../../components/states/empty-state";

type Row = { id: string; name: string; subjectName: string; label: string; submittedCount: number };

export default function MarksQueuePage() {
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    setRows(await api().exams.queue());
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <AppHeader title="Marks publish queue" subtitle="Submitted drafts waiting for academic publish." />
      {rows.length === 0 ? (
        <EmptyState title="Queue empty" detail="No submitted marks to publish." />
      ) : (
        <table className="mt-4 w-full overflow-hidden rounded-2xl bg-white text-left text-sm shadow-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-4 py-2">Exam</th>
              <th className="px-4 py-2">Section</th>
              <th className="px-4 py-2">Submitted</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">
                  {r.name} · {r.subjectName}
                </td>
                <td className="px-4 py-2">{r.label}</td>
                <td className="px-4 py-2">{r.submittedCount}</td>
                <td className="px-4 py-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await api().exams.publish(r.id);
                        toast.success("Published");
                        await load();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Publish failed");
                      }
                    }}
                  >
                    Publish
                  </Button>
                  <Link href={`/exams/${r.id}`} className="ml-3 text-primary">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
