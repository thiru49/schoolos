"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { todayIso } from "../../lib/utils";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import { Skeleton } from "../../components/ui/skeleton";
import { downloadAttendanceCsv } from "./download-csv";

type Section = { id: string; label: string };
type Row = { studentId: string; fullName: string; admissionNumber: string; P: number; A: number; L: number; H: number };

function monthStart() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function AttendanceReport() {
  const { acl } = useAppBranding();
  const canExport = acl.permissions.includes(PERMISSIONS.REPORTS_ATTENDANCE);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayIso());
  const [rows, setRows] = useState<Row[]>([]);
  const [label, setLabel] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "loaded" | "empty" | "error" | "denied" | "offline">(
    "idle",
  );
  const [message, setMessage] = useState("");

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
          return;
        }
        setState("error");
        setMessage(e instanceof Error ? e.message : "Could not load sections");
      });
  }, []);

  const run = useCallback(async () => {
    if (!sectionId) return;
    setState("loading");
    setMessage("");
    try {
      const data = await api().attendanceApi.report(sectionId, from, to);
      setRows(data.rows);
      setLabel(data.label);
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
      setMessage(e instanceof Error ? e.message : "Report failed");
    }
  }, [sectionId, from, to]);

  async function exportRange() {
    if (!sectionId) return;
    try {
      await downloadAttendanceCsv(
        api().attendanceApi.exportRangeUrl(sectionId, from, to),
        `attendance-${from}-to-${to}.csv`,
      );
    } catch {
      toast.error("Export failed");
    }
  }

  if (state === "denied") {
    return <PermissionDenied detail={message || "You cannot run this attendance report."} />;
  }

  return (
    <div className="space-y-4">
      <Link
        href="/reports"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
      >
        <ArrowLeft size={14} /> Back to Reports Hub
      </Link>
      <p className="font-tamil text-sm text-slate-500" lang="ta">
        வருகை அறிக்கை
      </p>
      <div className="flex flex-wrap gap-3">
        <select
          className="h-10 rounded-lg border px-3 text-sm"
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <input type="date" className="h-10 rounded-lg border px-3 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="h-10 rounded-lg border px-3 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button onClick={() => void run()}>Run report</Button>
        {canExport && sectionId ? (
          <Button variant="secondary" onClick={() => void exportRange()}>
            Export CSV
          </Button>
        ) : null}
      </div>

      {state === "loading" ? (
        <div className="mt-6">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : null}
      {state === "offline" || state === "error" ? (
        <div className="mt-6">
          <ErrorState message={message} onRetry={() => void run()} />
        </div>
      ) : null}
      {state === "empty" || (state === "idle" && rows.length === 0) ? (
        <div className="mt-6">
          <EmptyState
            title={state === "empty" ? "No attendance in this range" : "No report yet"}
            detail="Choose a section and date range, then run the report."
          />
        </div>
      ) : null}
      {state === "loaded" && rows.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          <p className="px-4 py-3 text-sm text-slate-500">
            {label} · {from} → {to}
          </p>
          <table className="w-full text-left text-sm">
            <thead className="bg-primary text-white">
              <tr>
                <th className="px-4 py-2">Admission</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">P</th>
                <th className="px-4 py-2">A</th>
                <th className="px-4 py-2">L</th>
                <th className="px-4 py-2">H</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.studentId} className="border-t">
                  <td className="px-4 py-2">{r.admissionNumber}</td>
                  <td className="px-4 py-2">{r.fullName}</td>
                  <td className="px-4 py-2">{r.P}</td>
                  <td className="px-4 py-2">{r.A}</td>
                  <td className="px-4 py-2">{r.L}</td>
                  <td className="px-4 py-2">{r.H}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
