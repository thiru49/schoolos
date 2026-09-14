import { PERMISSIONS, ROLE_CODES, type PermissionCode, type RoleCode } from "@schoolos/permissions";

export type SetupStepId =
  | "academic_year"
  | "classes"
  | "sections"
  | "subjects"
  | "teachers"
  | "students"
  | "branding";

export type StepCompletionStatus = "complete" | "incomplete" | "unknown";

export type SetupLoadState = "success" | "partial" | "failure" | "empty";

export interface OnboardingAcl {
  roles: readonly RoleCode[] | RoleCode[] | readonly string[] | string[];
  permissions: readonly PermissionCode[] | PermissionCode[] | readonly string[] | string[];
  scopes: readonly { type: string }[] | { type: string }[];
}

export const SETUP_STEP_ORDER: readonly SetupStepId[] = [
  "academic_year",
  "classes",
  "sections",
  "subjects",
  "teachers",
  "students",
  "branding",
] as const;

const SETUP_ADMIN_ROLES: readonly string[] = [
  ROLE_CODES.SCHOOL_SUPER_ADMIN,
  ROLE_CODES.SCHOOL_ADMIN,
  ROLE_CODES.ACADEMIC_ADMIN,
];

type StepDefinition = {
  id: SetupStepId;
  label: string;
  href: string;
  actionText: string;
  incompleteDetail: string;
};

export const SETUP_STEP_DEFINITIONS: Record<SetupStepId, StepDefinition> = {
  academic_year: {
    id: "academic_year",
    label: "Academic Year",
    href: "/academic-years",
    actionText: "Manage Years",
    incompleteDetail: "Create an academic year before classes can operate.",
  },
  classes: {
    id: "classes",
    label: "Classes",
    href: "/classes",
    actionText: "Manage Classes",
    incompleteDetail: "Define grade levels for the current academic year.",
  },
  sections: {
    id: "sections",
    label: "Sections",
    href: "/classes",
    actionText: "Manage Sections",
    incompleteDetail: "Add sections so students can be enrolled into class groups.",
  },
  subjects: {
    id: "subjects",
    label: "Subjects",
    href: "/subjects",
    actionText: "Configure Subjects",
    incompleteDetail: "Add the subject master list used by timetable, homework, and exams.",
  },
  teachers: {
    id: "teachers",
    label: "Teachers",
    href: "/teachers",
    actionText: "Onboard Teachers",
    incompleteDetail: "Add teaching faculty to assign to sections and subjects.",
  },
  students: {
    id: "students",
    label: "Students",
    href: "/students",
    actionText: "Enroll Students",
    incompleteDetail: "Enroll students into classes and sections.",
  },
  branding: {
    id: "branding",
    label: "School Branding / Settings",
    href: "/settings",
    actionText: "Review Settings",
    incompleteDetail: "Set the school name and operational identity in settings.",
  },
};

export interface SetupSnapshot {
  academicYearCount: number | null;
  classCount: number | null;
  sectionCount: number | null;
  subjectCount: number | null;
  teacherCount: number | null;
  studentCount: number | null;
  schoolName: string | null;
}

export interface EvaluatedSetupStep {
  id: SetupStepId;
  label: string;
  href: string;
  actionText: string;
  detail: string;
  status: StepCompletionStatus;
}

export interface EvaluatedSetupJourney {
  steps: EvaluatedSetupStep[];
  completedCount: number;
  readyForOperations: boolean;
}

export interface EvaluatedSetupSnapshot {
  loadState: SetupLoadState;
  snapshot: SetupSnapshot;
  failedFields: SetupStepId[];
}

export function hasSchoolScope(acl: OnboardingAcl): boolean {
  return acl.scopes.some((s) => s.type === "school");
}

export function canSeeSetupGuidance(acl: OnboardingAcl): boolean {
  const isAdmin = acl.roles.some((role) => SETUP_ADMIN_ROLES.includes(role));
  return isAdmin && hasSchoolScope(acl) && getVisibleSetupSteps(acl).length > 0;
}

function hasPermission(acl: OnboardingAcl, permission: PermissionCode): boolean {
  return (acl.permissions as readonly string[]).includes(permission);
}

/**
 * A step is shown only when the user can open the existing management screen
 * and the tenant scope is school-wide.
 */
export function canActOnSetupStep(acl: OnboardingAcl, stepId: SetupStepId): boolean {
  if (!hasSchoolScope(acl)) return false;

  switch (stepId) {
    case "academic_year":
      return hasPermission(acl, PERMISSIONS.ACADEMIC_YEAR_MANAGE);
    case "classes":
    case "sections":
      return hasPermission(acl, PERMISSIONS.CLASSES_MANAGE);
    case "subjects":
      return hasPermission(acl, PERMISSIONS.SUBJECTS_MANAGE);
    case "teachers":
      return hasPermission(acl, PERMISSIONS.TEACHERS_READ);
    case "students":
      return hasPermission(acl, PERMISSIONS.STUDENTS_READ);
    case "branding":
      return hasPermission(acl, PERMISSIONS.SCHOOL_SETTINGS_READ);
    default:
      return false;
  }
}

export function getVisibleSetupSteps(acl: OnboardingAcl): SetupStepId[] {
  return SETUP_STEP_ORDER.filter((stepId) => canActOnSetupStep(acl, stepId));
}

export function emptySetupSnapshot(): SetupSnapshot {
  return {
    academicYearCount: null,
    classCount: null,
    sectionCount: null,
    subjectCount: null,
    teacherCount: null,
    studentCount: null,
    schoolName: null,
  };
}

function countFromSettled(result: PromiseSettledResult<unknown[]> | undefined): {
  count: number | null;
  failed: boolean;
} {
  if (!result) return { count: null, failed: false };
  if (result.status === "fulfilled") return { count: result.value.length, failed: false };
  return { count: null, failed: true };
}

export function evaluateSetupSnapshot(results: {
  years?: PromiseSettledResult<unknown[]>;
  classes?: PromiseSettledResult<unknown[]>;
  sections?: PromiseSettledResult<unknown[]>;
  subjects?: PromiseSettledResult<unknown[]>;
  teachers?: PromiseSettledResult<unknown[]>;
  students?: PromiseSettledResult<unknown[]>;
  branding?: PromiseSettledResult<{ schoolName?: string | null }>;
}): EvaluatedSetupSnapshot {
  const failedFields: SetupStepId[] = [];
  const snapshot = emptySetupSnapshot();
  let requested = 0;

  const years = countFromSettled(results.years);
  if (results.years) {
    requested += 1;
    snapshot.academicYearCount = years.count;
    if (years.failed) failedFields.push("academic_year");
  }

  const classes = countFromSettled(results.classes);
  if (results.classes) {
    requested += 1;
    snapshot.classCount = classes.count;
    if (classes.failed) failedFields.push("classes");
  }

  const sections = countFromSettled(results.sections);
  if (results.sections) {
    requested += 1;
    snapshot.sectionCount = sections.count;
    if (sections.failed) failedFields.push("sections");
  }

  const subjects = countFromSettled(results.subjects);
  if (results.subjects) {
    requested += 1;
    snapshot.subjectCount = subjects.count;
    if (subjects.failed) failedFields.push("subjects");
  }

  const teachers = countFromSettled(results.teachers);
  if (results.teachers) {
    requested += 1;
    snapshot.teacherCount = teachers.count;
    if (teachers.failed) failedFields.push("teachers");
  }

  const students = countFromSettled(results.students);
  if (results.students) {
    requested += 1;
    snapshot.studentCount = students.count;
    if (students.failed) failedFields.push("students");
  }

  if (results.branding) {
    requested += 1;
    if (results.branding.status === "fulfilled") {
      const name = results.branding.value.schoolName?.trim() ?? "";
      snapshot.schoolName = name;
    } else {
      snapshot.schoolName = null;
      failedFields.push("branding");
    }
  }

  if (requested === 0) {
    return { loadState: "empty", snapshot, failedFields };
  }
  if (failedFields.length === requested) {
    return { loadState: "failure", snapshot, failedFields };
  }
  if (failedFields.length > 0) {
    return { loadState: "partial", snapshot, failedFields };
  }
  return { loadState: "success", snapshot, failedFields: [] };
}

export function evaluateStepCompletion(stepId: SetupStepId, snapshot: SetupSnapshot): StepCompletionStatus {
  switch (stepId) {
    case "academic_year":
      if (snapshot.academicYearCount === null) return "unknown";
      return snapshot.academicYearCount > 0 ? "complete" : "incomplete";
    case "classes":
      if (snapshot.classCount === null) return "unknown";
      return snapshot.classCount > 0 ? "complete" : "incomplete";
    case "sections":
      if (snapshot.sectionCount === null) return "unknown";
      return snapshot.sectionCount > 0 ? "complete" : "incomplete";
    case "subjects":
      if (snapshot.subjectCount === null) return "unknown";
      return snapshot.subjectCount > 0 ? "complete" : "incomplete";
    case "teachers":
      if (snapshot.teacherCount === null) return "unknown";
      return snapshot.teacherCount > 0 ? "complete" : "incomplete";
    case "students":
      if (snapshot.studentCount === null) return "unknown";
      return snapshot.studentCount > 0 ? "complete" : "incomplete";
    case "branding":
      if (snapshot.schoolName === null) return "unknown";
      return snapshot.schoolName.trim().length > 0 ? "complete" : "incomplete";
    default:
      return "unknown";
  }
}

export function describeSetupStep(stepId: SetupStepId, snapshot: SetupSnapshot, status: StepCompletionStatus): string {
  const definition = SETUP_STEP_DEFINITIONS[stepId];
  if (status === "unknown") return "Could not load this step from the current school.";
  if (status === "incomplete") return definition.incompleteDetail;

  switch (stepId) {
    case "academic_year":
      return `${snapshot.academicYearCount} academic ${snapshot.academicYearCount === 1 ? "year" : "years"} configured`;
    case "classes":
      return `${snapshot.classCount} ${snapshot.classCount === 1 ? "class" : "classes"} defined`;
    case "sections":
      return `${snapshot.sectionCount} ${snapshot.sectionCount === 1 ? "section" : "sections"} defined`;
    case "subjects":
      return `${snapshot.subjectCount} ${snapshot.subjectCount === 1 ? "subject" : "subjects"} configured`;
    case "teachers":
      return `${snapshot.teacherCount} ${snapshot.teacherCount === 1 ? "teacher" : "teachers"} onboarded`;
    case "students":
      return `${snapshot.studentCount} ${snapshot.studentCount === 1 ? "student" : "students"} enrolled`;
    case "branding":
      return snapshot.schoolName ? `Identity set: ${snapshot.schoolName}` : definition.incompleteDetail;
    default:
      return definition.incompleteDetail;
  }
}

export function buildSetupJourney(acl: OnboardingAcl, snapshot: SetupSnapshot): EvaluatedSetupJourney {
  const steps: EvaluatedSetupStep[] = getVisibleSetupSteps(acl).map((stepId) => {
    const definition = SETUP_STEP_DEFINITIONS[stepId];
    const status = evaluateStepCompletion(stepId, snapshot);
    return {
      id: stepId,
      label: definition.label,
      href: definition.href,
      actionText: definition.actionText,
      detail: describeSetupStep(stepId, snapshot, status),
      status,
    };
  });

  const completedCount = steps.filter((step) => step.status === "complete").length;
  const readyForOperations =
    steps.length > 0 && steps.every((step) => step.status === "complete");

  return { steps, completedCount, readyForOperations };
}
