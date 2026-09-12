import { attendanceReportSchema, rosterQuerySchema } from "@schoolos/validation";

export function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export type DayExportQuery = { kind: "day"; sectionId: string; date: string };
export type RangeExportQuery = { kind: "range"; sectionId: string; from: string; to: string };

export function parseAttendanceExportQuery(query: unknown): DayExportQuery | RangeExportQuery {
  const obj = (query ?? {}) as Record<string, unknown>;
  if (typeof obj.from === "string" && typeof obj.to === "string") {
    const q = attendanceReportSchema.parse(query);
    return { kind: "range", sectionId: q.sectionId, from: q.from, to: q.to };
  }
  const q = rosterQuerySchema.parse(query);
  return { kind: "day", sectionId: q.sectionId, date: q.date };
}

export function formatRosterCsv(
  rows: { admissionNumber: string; fullName: string; status: string | null }[],
) {
  const header = "admission_number,full_name,status";
  const lines = rows.map(
    (r) => `${csvCell(r.admissionNumber)},${csvCell(r.fullName)},${csvCell(r.status ?? "")}`,
  );
  return `${header}\n${lines.join("\n")}\n`;
}

export function formatReportCsv(
  rows: { admissionNumber: string; fullName: string; P: number; A: number; L: number; H: number }[],
) {
  const header = "admission_number,full_name,present,absent,late,holiday";
  const lines = rows.map(
    (r) => `${csvCell(r.admissionNumber)},${csvCell(r.fullName)},${r.P},${r.A},${r.L},${r.H}`,
  );
  return `${header}\n${lines.join("\n")}\n`;
}
