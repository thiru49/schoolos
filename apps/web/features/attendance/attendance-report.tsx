"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { todayIso } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { Skeleton } from "../../components/ui/skeleton";

type Section = { id: string; label: string };
type Row = { studentId: string; fullName: string; admissionNumber: string; P: number; A: number; L: number; H: number };

export function AttendanceReport() {
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [rows, setRows] = useState<Row[]>([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api()
      .academics.sections()
      .then((list) => {
        setSections(list);
        if (list[0]) setSectionId(list[0].id);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const run = useCallback(async () => {
    if (!sectionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api().attendanceApi.report(sectionId, from, to);
      setRows(data.rows);
      setLabel(data.label);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report failed");
    } finally {
      setLoading(false);
    }
  }, [sectionId, from, to]);

  return (
    <div>
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
      </div>
      {loading ? <div className="mt-6"><Skeleton className="h-40 w-full" /></div> : null}
      {error ? <div className="mt-6"><ErrorState message={error} onRetry={() => void run()} /></div> : null}
      {!loading && !error && rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No report yet" detail="Choose a section and date range, then run the report." />
        </div>
      ) : null}
      {rows.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          <p className="px-4 py-3 text-sm text-slate-500">{label}</p>
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
