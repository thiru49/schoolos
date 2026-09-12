export const PERMISSIONS = {
  SCHOOL_SETTINGS_READ: "school.settings.read",
  SCHOOL_SETTINGS_UPDATE: "school.settings.update",
  SCHOOL_BRANDING_UPDATE: "school.branding.update",
  ACADEMIC_YEAR_MANAGE: "academic_year.manage",
  ROLES_ASSIGN: "roles.assign",
  ADMINS_CREATE: "admins.create",
  USERS_MANAGE_SUPER: "users.manage_super",
  STUDENTS_READ: "students.read",
  STUDENTS_WRITE: "students.write",
  PARENTS_READ: "parents.read",
  PARENTS_WRITE: "parents.write",
  TEACHERS_READ: "teachers.read",
  TEACHERS_WRITE: "teachers.write",
  CLASSES_MANAGE: "classes.manage",
  SUBJECTS_MANAGE: "subjects.manage",
  TIMETABLE_READ: "timetable.read",
  TIMETABLE_WRITE: "timetable.write",
  ATTENDANCE_READ: "attendance.read",
  ATTENDANCE_MARK: "attendance.mark",
  HOMEWORK_READ: "homework.read",
  HOMEWORK_CREATE: "homework.create",
  HOMEWORK_COMPLETE: "homework.complete",
  EXAMS_READ: "exams.read",
  EXAMS_WRITE: "exams.write",
  MARKS_DRAFT: "marks.draft",
  MARKS_SUBMIT: "marks.submit",
  MARKS_PUBLISH: "marks.publish",
  MARKS_READ: "marks.read",
  FEES_READ: "fees.read",
  FEES_STRUCTURE_WRITE: "fees.structure.write",
  FEES_RECORD: "fees.record",
  RECEIPTS_READ: "receipts.read",
  NOTICES_WRITE: "notices.write",
  NOTICES_READ: "notices.read",
  EVENTS_WRITE: "events.write",
  EVENTS_READ: "events.read",
  HOLIDAYS_MANAGE: "holidays.manage",
  NOTIFICATIONS_SEND: "notifications.send",
  REPORTS_ATTENDANCE: "reports.attendance",
  REPORTS_FEES: "reports.fees",
  REPORTS_PROGRESS: "reports.progress",
  AUDIT_READ: "audit.read",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_CODES = Object.values(PERMISSIONS);

export const SCOPE_TYPES = [
  "school",
  "class",
  "section",
  "subject",
  "self",
  "children",
] as const;

export type ScopeType = (typeof SCOPE_TYPES)[number];

export const ROLE_CODES = {
  PLATFORM_OWNER: "platform_owner",
  SCHOOL_SUPER_ADMIN: "school_super_admin",
  SCHOOL_ADMIN: "school_admin",
  ACCOUNTS_ADMIN: "accounts_admin",
  ACADEMIC_ADMIN: "academic_admin",
  TEACHER: "teacher",
  PARENT: "parent",
  STUDENT: "student",
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export const ATTENDANCE_STATUSES = ["P", "A", "L", "H"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
