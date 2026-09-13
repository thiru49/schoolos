"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError } from "@schoolos/api-client";
import { toast } from "sonner";
import { api } from "../../../../lib/api";
import { AppHeader } from "../../../../components/shell/app-header";
import { Button } from "../../../../components/ui/button";
import { EmptyState } from "../../../../components/states/empty-state";
import { ErrorState } from "../../../../components/states/error-state";
import { PermissionDenied } from "../../../../components/states/permission-denied";
import { Skeleton } from "../../../../components/ui/skeleton";

type Row = { id: string; name: string; subjectName: string; label: string; submittedCount: number };

export default function MarksQueuePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const list = await api().exams.queue();
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
      setMessage(e instanceof Error ? e.message : "Failed to load queue");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <AppHeader title="Marks publish queue" subtitle="Submitted drafts waiting for academic publish." />
      {state === "denied" ? <PermissionDenied detail={message || "You cannot publish marks."} /> : null}
      {state === "loading" ? <Skeleton className="h-40 w-full" /> : null}
      {state === "offline" || state === "error" ? <ErrorState message={message} onRetry={() => void load()} /> : null}
      {state === "empty" ? (
        <EmptyState title="Queue empty" detail="No submitted marks to publish." />
      ) : null}
      {state === "loaded" ? (
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
      ) : null}
    </div>
  );
}
