export function formatTeacherAttendanceMetric(input: {
  total: number;
  unmarked: number;
  marked: number;
}): string {
  if (input.total === 0) return "No roster";
  if (input.unmarked === 0 && input.marked > 0) return "Saved";
  if (input.unmarked === input.total) return "Pending";
  return `${input.unmarked} left`;
}

export function formatStudentIdentity(input: {
  fullName?: string | null;
  userId?: string | null;
  className?: string | null;
  sectionName?: string | null;
}): { title: string; badge: string } {
  const title = input.fullName?.trim() || input.userId || "Student";
  const klass = [input.className, input.sectionName].filter(Boolean).join("-");
  return {
    title,
    badge: klass ? `Student · ${klass}` : "Student · own record only",
  };
}

export function formatParentChildBadge(className?: string | null, sectionName?: string | null): string {
  const klass = [className, sectionName].filter(Boolean).join("-");
  return klass ? `Parent · ${klass}` : "Parent · select child";
}
