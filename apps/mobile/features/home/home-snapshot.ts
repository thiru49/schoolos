export type TimetablePeriod = {
  weekday: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  label: string;
  published: boolean;
};

export function getTodayWeekday(date = new Date()): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function filterTodayPeriods(periods: TimetablePeriod[], weekday = getTodayWeekday()): TimetablePeriod[] {
  return periods
    .filter((period) => period.weekday === weekday && period.published)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function summarizeTodayClasses(periods: TimetablePeriod[], now = new Date()): string {
  const today = filterTodayPeriods(periods, getTodayWeekday(now));
  if (today.length === 0) return "No classes scheduled today";

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const active = today.find((period) => {
    const [startHour, startMinute] = period.startTime.split(":").map(Number);
    const [endHour, endMinute] = period.endTime.split(":").map(Number);
    if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) return false;
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    return currentMinutes >= start && currentMinutes < end;
  });
  if (active) return `Now: ${active.subjectName}`;

  const upcoming = today.find((period) => {
    const [startHour, startMinute] = period.startTime.split(":").map(Number);
    if (Number.isNaN(startHour) || Number.isNaN(startMinute)) return false;
    return startHour * 60 + startMinute > currentMinutes;
  });
  if (upcoming) return `Next: ${upcoming.subjectName} at ${upcoming.startTime.slice(0, 5)}`;

  return `${today.length} class${today.length === 1 ? "" : "es"} today`;
}

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  P: "Present",
  A: "Absent",
  L: "Late",
  H: "Holiday",
};

export function formatAttendanceStatus(status: string | null | undefined): string {
  if (!status) return "Not marked yet";
  return ATTENDANCE_STATUS_LABELS[status] ?? status;
}

export function formatFeeDues(dues: number | null | undefined): string {
  if (dues == null) return "—";
  if (dues === 0) return "No dues";
  return `Dues ₹${dues}`;
}

export function todayIsoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
