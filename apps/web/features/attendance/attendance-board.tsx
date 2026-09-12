"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS, type AttendanceStatus } from "@schoolos/permissions";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { todayIso } from "../../lib/utils";
import { Badge, statusBadge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import { downloadAttendanceCsv } from "./download-csv";

type Section = { id: string; label: string };
type Row = { studentId: string; fullName: string; status: string | null };

const TAMIL: Record<string, string> = {
  attendance: "வருகை",
  present: "வந்தார்",
  absent: "வரவில்லை",
  late: "தாமதம்",
  holiday: "விடுமுறை",
  submit: "வருகையை சமர்ப்பி",
  saved: "வருகை சேமிக்கப்பட்டது",
};

export function AttendanceBoard() {
  const { acl } = useAppBranding();
  const canMark = acl.permissions.includes(PERMISSIONS.ATTENDANCE_MARK);
  const canExport = acl.permissions.includes(PERMISSIONS.REPORTS_ATTENDANCE);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<
    "loading" | "loaded" | "saving" | "empty" | "error" | "denied" | "offline" | "success"
  >("loading");
  const [message, setMessage] = useState("");

  const summary = useMemo(() => {
    const present = rows.filter((r) => r.status === "P").length;
    const absent = rows.filter((r) => r.status === "A").length;
    const late = rows.filter((r) => r.status === "L").length;
    return { present, absent, late, total: rows.length };
  }, [rows]);

  const loadSections = useCallback(async () => {
    try {
      const list = await api().academics.sections();
      setSections(list);
      setSectionId((current) => current || list[0]?.id || "");
      if (list.length === 0) {
        setState("empty");
        setRows([]);
      }
    } catch (e) {
      mapError(e);
    }
  }, []);

  const loadRoster = useCallback(async () => {
    if (!sectionId) return;
    setState("loading");
    setMessage("");
    try {
      const data = await api().attendanceApi.list({ sectionId, date });
      const next = data.records.map((r) => ({
        studentId: r.studentId,
        fullName: r.fullName,
        status: r.status,
      }));
      setRows(next);
      setState(next.length === 0 ? "empty" : "loaded");
    } catch (e) {
      mapError(e);
    }
  }, [sectionId, date]);

  function mapError(e: unknown) {
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
    setMessage(e instanceof Error ? e.message : "Failed to load attendance");
  }

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  useEffect(() => {
    if (sectionId) void loadRoster();
  }, [sectionId, date, loadRoster]);

  async function downloadCsv() {
    try {
      await downloadAttendanceCsv(
        api().attendanceApi.exportUrl(sectionId, date),
        `attendance-${date}.csv`,
      );
    } catch {
      toast.error("Export failed");
    }
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
    if (state === "success") setState("loaded");
  }

  async function save() {
    if (!sectionId) return;
    const marks = rows
      .filter((r) => r.status)
      .map((r) => ({ studentId: r.studentId, status: r.status as AttendanceStatus }));
    if (marks.length === 0) {
      toast.error("Mark at least one student");
      return;
    }
    setState("saving");
    try {
      await api().attendanceApi.mark({ sectionId, date, marks });
      toast.success("Attendance saved");
      setMessage(TAMIL.saved);
      setState("success");
    } catch (e) {
      mapError(e);
    }
  }

  if (state === "denied") {
    return <PermissionDenied detail={message || "You cannot view this section."} />;
  }
  if (state === "offline") {
    return <ErrorState message={message} onRetry={() => void loadRoster()} />;
  }
  if (state === "error") {
    return <ErrorState message={message} onRetry={() => void loadRoster()} />;
  }

  return (
    <div className="relative pb-24">
      <p className="font-tamil mb-3 text-sm text-slate-500" lang="ta">
        {TAMIL.attendance}
      </p>
      <div className="flex flex-wrap gap-3">
        <select
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {canExport && sectionId ? (
          <Button variant="secondary" onClick={() => void downloadCsv()}>
            Export CSV
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-slate-500">Present</p>
          <p className="font-tamil text-xs text-slate-400" lang="ta">
            {TAMIL.present}
          </p>
          <p className="mt-1 font-display text-2xl text-success">{summary.present}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Absent</p>
          <p className="font-tamil text-xs text-slate-400" lang="ta">
            {TAMIL.absent}
          </p>
          <p className="mt-1 font-display text-2xl text-danger">{summary.absent}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Late</p>
          <p className="font-tamil text-xs text-slate-400" lang="ta">
            {TAMIL.late}
          </p>
          <p className="mt-1 font-display text-2xl text-warning">{summary.late}</p>
        </Card>
      </div>

      {state === "success" ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-success">
          Attendance saved · Present {summary.present} · Absent {summary.absent} · Late {summary.late}
          <p className="font-tamil mt-1" lang="ta">
            {TAMIL.saved}
          </p>
        </div>
      ) : null}

      {state === "loading" ? (
        <div className="mt-6 space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}

      {state === "empty" ? (
        <div className="mt-6">
          <EmptyState title="No students" detail="There are no students in this section for the selected date." />
        </div>
      ) : null}

      {(state === "loaded" || state === "saving" || state === "success") && rows.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-primary text-white">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Status</th>
                {canMark ? <th className="px-4 py-3">Mark</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.studentId} className="border-t">
                  <td className="px-4 py-3 font-medium">{r.fullName}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  {canMark ? (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {(["P", "A", "L", "H"] as AttendanceStatus[]).map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant={r.status === s ? "primary" : "secondary"}
                            onClick={() => setStatus(r.studentId, s)}
                            disabled={state === "saving"}
                          >
                            {s}
                          </Button>
                        ))}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {canMark && rows.length > 0 ? (
        <div className="sticky bottom-0 z-10 mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
          <Badge variant="muted">{summary.total} students</Badge>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={state === "saving"}
              onClick={() => setRows((prev) => prev.map((r) => ({ ...r, status: "P" })))}
            >
              Mark all Present
            </Button>
            <Button onClick={() => void save()} disabled={state === "saving"}>
              {state === "saving" ? "Saving…" : "Save attendance"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
