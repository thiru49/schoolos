"use client";

import { DAYS, type BellSlot, type Period, type Section } from "./timetable-types";

type TimetablePrintProps = {
  schoolName: string;
  section: Section;
  periods: Period[];
  slots: BellSlot[];
};

export function TimetablePrint({ schoolName, section, periods, slots }: TimetablePrintProps) {
  // Days Mon-Sat (1..6)
  const printDays = DAYS.slice(0, 6);

  // Map of periods by `${weekday}-${slot.startTime}`
  const periodMap = new Map<string, Period>();
  for (const p of periods) {
    periodMap.set(`${p.weekday}-${p.startTime}`, p);
  }

  return (
    <div id="printable-timetable" className="hidden print:block print:p-8">
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 12mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-950">
          {schoolName || "SchoolOS Academy"}
        </h1>
        <p className="mt-1 text-sm font-semibold uppercase text-slate-700">
          Official Class Timetable — Section {section.label}
        </p>
        <div className="mt-2 flex justify-between text-xs text-slate-600">
          <span>Academic Year: 2026–2027</span>
          <span>Class & Section: {section.label}</span>
          <span>Generated: {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Timetable Table */}
      <table className="mt-6 w-full border-collapse border border-slate-900 text-center text-xs">
        <thead>
          <tr className="bg-slate-100 font-bold">
            <th className="border border-slate-900 p-2 text-left">Timing / Period</th>
            {printDays.map((d) => (
              <th key={d.weekday} className="border border-slate-900 p-2">
                {d.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot.slotNumber}>
              <td className="border border-slate-900 bg-slate-50 p-2 text-left font-semibold">
                <div>{slot.label}</div>
                <div className="text-[10px] text-slate-500">
                  {slot.startTime} – {slot.endTime}
                </div>
              </td>
              {printDays.map((d) => {
                // Find matching period either by exact start time or overlapping interval
                const p = periods.find(
                  (item) => item.weekday === d.weekday && item.startTime === slot.startTime,
                );
                return (
                  <td key={d.weekday} className="border border-slate-900 p-2 align-top">
                    {p ? (
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-950">{p.subjectName}</div>
                        <div className="text-[10px] text-slate-600">{p.teacherName}</div>
                        {!p.published ? (
                          <div className="text-[9px] italic text-amber-700">[Draft]</div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Signature Footer */}
      <div className="mt-12 flex items-end justify-between pt-8 text-xs text-slate-700">
        <div className="text-center">
          <div className="w-36 border-t border-slate-900 pt-1 font-semibold">
            Class Teacher
          </div>
        </div>
        <div className="text-center">
          <div className="w-36 border-t border-slate-900 pt-1 font-semibold">
            Academic Coordinator
          </div>
        </div>
        <div className="text-center">
          <div className="w-36 border-t border-slate-900 pt-1 font-semibold">
            Principal / Headmaster
          </div>
        </div>
      </div>
    </div>
  );
}
