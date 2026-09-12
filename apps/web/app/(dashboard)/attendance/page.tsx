"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

type Section = { id: string; label: string };
type Row = { studentId: string; fullName: string; admissionNumber: string; status: string | null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api()
      .academics.sections()
      .then((list) => {
        setSections(list);
        if (list[0]) setSectionId(list[0].id);
        if (list.length === 0) setEmpty(true);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function load() {
    if (!sectionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api().attendanceApi.list({ sectionId, date });
      const next = data.records.map((r) => ({
        studentId: r.studentId,
        fullName: r.fullName,
        admissionNumber: "",
        status: r.status,
      }));
      setRows(next);
      setEmpty(next.length === 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sectionId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, date]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-primary">Attendance</h1>
      <div className="mt-4 flex gap-3">
        <select
          className="rounded-lg border px-3 py-2"
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <input type="date" className="rounded-lg border px-3 py-2" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {loading ? <p className="mt-6 text-slate-500">Loading…</p> : null}
      {error ? <p className="mt-6 text-danger">{error}</p> : null}
      {empty && !loading ? <p className="mt-6 text-slate-500">No students in this section.</p> : null}
      {!loading && rows.length > 0 ? (
        <table className="mt-6 w-full overflow-hidden rounded-xl bg-white text-left text-sm shadow-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId} className="border-t">
                <td className="px-4 py-2">{r.fullName}</td>
                <td className="px-4 py-2">{r.status ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
