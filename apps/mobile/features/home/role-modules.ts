export type AcademicRole = "teacher" | "parent" | "student" | null;

export type AcademicModuleId =
  | "attendance"
  | "timetable"
  | "homework"
  | "marks"
  | "report-card"
  | "fees";

/** Role-filtered academics hub. Teacher never sees fees or official report-card download. */
export function getAcademicModulesForRole(role: AcademicRole): AcademicModuleId[] {
  if (role === "teacher") {
    return ["attendance", "timetable", "homework", "marks"];
  }
  if (role === "parent") {
    return ["attendance", "timetable", "homework", "marks", "report-card", "fees"];
  }
  if (role === "student") {
    return ["timetable", "homework", "attendance", "marks", "report-card"];
  }
  return ["attendance", "timetable", "fees"];
}

export function teacherMustNotSee(): AcademicModuleId[] {
  return ["fees", "report-card"];
}
