import type { NoticeTargetRole } from "@schoolos/api-client";
import type {
  MobileEventItem,
  MobileHolidayItem,
} from "./communications-types";

/**
 * Notice audience presentation formatting
 */
export function formatAudienceLabel(role: NoticeTargetRole): {
  label: string;
  bg: string;
  text: string;
} {
  switch (role) {
    case "student":
      return { label: "Students", bg: "#dbeafe", text: "#1d4ed8" };
    case "parent":
      return { label: "Parents", bg: "#f3e8ff", text: "#7e22ce" };
    case "teacher":
      return { label: "Teachers", bg: "#fef3c7", text: "#b45309" };
    default:
      return { label: "Everyone", bg: "#f1f5f9", text: "#475569" };
  }
}

/**
 * Format ISO timestamp into human-readable date
 */
export function formatNoticeDate(isoString: string | null | undefined): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Format schedule dates for single-day or multi-day range
 */
export function formatEventSchedule(startDateStr: string, endDateStr: string): string {
  try {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime())) return "";

    const startFormatted = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (isNaN(end.getTime()) || start.toDateString() === end.toDateString()) {
      return startFormatted;
    }

    const endFormatted = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `${startFormatted} – ${endFormatted}`;
  } catch {
    return startDateStr;
  }
}

/**
 * Check if event is ongoing or upcoming relative to reference date
 */
export function isEventUpcoming(event: MobileEventItem, refDate = new Date()): boolean {
  try {
    const end = new Date(event.endDate);
    if (!isNaN(end.getTime())) {
      return end.getTime() >= refDate.getTime();
    }
    const start = new Date(event.startDate);
    return start.getTime() >= refDate.getTime();
  } catch {
    return true;
  }
}

/**
 * Breakdown holiday ISO date into day number, short month, weekday, and year
 */
export function formatHolidayDate(dateStr: string): {
  dayNumber: string;
  monthName: string;
  dayOfWeek: string;
  year: string;
} {
  try {
    // Treat date as local date to prevent timezone shift (YYYY-MM-DD)
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(parseInt(year, 10), monthIndex, day);
      return {
        dayNumber: String(day),
        monthName: d.toLocaleDateString("en-US", { month: "short" }),
        dayOfWeek: d.toLocaleDateString("en-US", { weekday: "long" }),
        year,
      };
    }
    const d = new Date(dateStr);
    return {
      dayNumber: String(d.getDate()),
      monthName: d.toLocaleDateString("en-US", { month: "short" }),
      dayOfWeek: d.toLocaleDateString("en-US", { weekday: "long" }),
      year: String(d.getFullYear()),
    };
  } catch {
    return { dayNumber: "", monthName: "", dayOfWeek: "", year: "" };
  }
}

/**
 * Sort holidays chronologically in ascending date order
 */
export function sortHolidaysChronologically(holidays: MobileHolidayItem[]): MobileHolidayItem[] {
  return [...holidays].sort((a, b) => a.date.localeCompare(b.date));
}

const CACHE_PREFIX = "schoolos_comms_";

/**
 * Partition cache key by schoolId, userId, active role, and optional childId.
 * Returns null (fails closed) if any required auth context (schoolId, userId, role) is missing.
 */
export function buildCommunicationsCacheKey(
  schoolId?: string | null,
  userId?: string | null,
  role?: string | null,
  childId?: string | null,
): string | null {
  if (!schoolId || !userId || !role) {
    return null;
  }
  const parts = [schoolId, userId, role];
  if (childId) {
    parts.push(childId);
  }
  const raw = parts.join("_");
  const sanitized = raw.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${CACHE_PREFIX}${sanitized}`;
}
