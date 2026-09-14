import assert from "node:assert/strict";
import { PERMISSIONS, ROLE_CODES } from "@schoolos/permissions";
import {
  buildSetupJourney,
  canActOnSetupStep,
  canSeeSetupGuidance,
  emptySetupSnapshot,
  evaluateSetupSnapshot,
  evaluateStepCompletion,
  getVisibleSetupSteps,
  SETUP_STEP_DEFINITIONS,
  SETUP_STEP_ORDER,
  type OnboardingAcl,
  type SetupSnapshot,
} from "../features/onboarding/onboarding-policy";

console.log("Starting WEB-ONBOARDING-001 / PRODUCT-UX-003 setup guidance tests...\n");

const schoolScope = [{ type: "school" as const }];
const sectionScope = [{ type: "section" as const }];

const superAdminAcl: OnboardingAcl = {
  roles: [ROLE_CODES.SCHOOL_SUPER_ADMIN],
  permissions: [
    PERMISSIONS.ACADEMIC_YEAR_MANAGE,
    PERMISSIONS.CLASSES_MANAGE,
    PERMISSIONS.SUBJECTS_MANAGE,
    PERMISSIONS.TEACHERS_READ,
    PERMISSIONS.TEACHERS_WRITE,
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.STUDENTS_WRITE,
    PERMISSIONS.SCHOOL_SETTINGS_READ,
    PERMISSIONS.SCHOOL_BRANDING_UPDATE,
  ],
  scopes: schoolScope,
};

const schoolAdminAcl: OnboardingAcl = {
  roles: [ROLE_CODES.SCHOOL_ADMIN],
  permissions: [
    PERMISSIONS.CLASSES_MANAGE,
    PERMISSIONS.SUBJECTS_MANAGE,
    PERMISSIONS.TEACHERS_READ,
    PERMISSIONS.TEACHERS_WRITE,
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.STUDENTS_WRITE,
    PERMISSIONS.SCHOOL_SETTINGS_READ,
    PERMISSIONS.ATTENDANCE_READ,
  ],
  scopes: schoolScope,
};

const academicAdminAcl: OnboardingAcl = {
  roles: [ROLE_CODES.ACADEMIC_ADMIN],
  permissions: [
    PERMISSIONS.CLASSES_MANAGE,
    PERMISSIONS.SUBJECTS_MANAGE,
    PERMISSIONS.TEACHERS_READ,
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.SCHOOL_SETTINGS_READ,
    PERMISSIONS.ATTENDANCE_READ,
  ],
  scopes: schoolScope,
};

const teacherAcl: OnboardingAcl = {
  roles: [ROLE_CODES.TEACHER],
  permissions: [PERMISSIONS.TEACHERS_READ, PERMISSIONS.STUDENTS_READ, PERMISSIONS.ATTENDANCE_READ],
  scopes: sectionScope,
};

const accountsAdminAcl: OnboardingAcl = {
  roles: [ROLE_CODES.ACCOUNTS_ADMIN],
  permissions: [PERMISSIONS.SCHOOL_SETTINGS_READ, PERMISSIONS.FEES_READ],
  scopes: schoolScope,
};

// ============================================================================
// 1. Permission gating: only show steps the user can act on
// ============================================================================

assert.deepEqual(
  getVisibleSetupSteps(superAdminAcl),
  [...SETUP_STEP_ORDER],
  "Super admin sees the full first-run journey",
);
assert.equal(canSeeSetupGuidance(superAdminAcl), true);
assert.equal(canActOnSetupStep(superAdminAcl, "academic_year"), true);

assert.equal(canActOnSetupStep(schoolAdminAcl, "academic_year"), false, "School admin cannot manage academic years");
assert.equal(canActOnSetupStep(schoolAdminAcl, "classes"), true);
assert.equal(canActOnSetupStep(schoolAdminAcl, "sections"), true);
assert.equal(canActOnSetupStep(schoolAdminAcl, "subjects"), true);
assert.equal(canActOnSetupStep(schoolAdminAcl, "teachers"), true);
assert.equal(canActOnSetupStep(schoolAdminAcl, "students"), true);
assert.equal(canActOnSetupStep(schoolAdminAcl, "branding"), true);
assert.deepEqual(
  getVisibleSetupSteps(schoolAdminAcl),
  ["classes", "sections", "subjects", "teachers", "students", "branding"],
  "School admin journey skips academic year management",
);
assert.equal(canSeeSetupGuidance(schoolAdminAcl), true);

assert.equal(canActOnSetupStep(academicAdminAcl, "academic_year"), false);
assert.equal(canActOnSetupStep(academicAdminAcl, "classes"), true);
assert.equal(canSeeSetupGuidance(academicAdminAcl), true);

assert.equal(canSeeSetupGuidance(teacherAcl), false, "Teachers do not receive school setup guidance");
assert.equal(canActOnSetupStep(teacherAcl, "teachers"), false, "Section-scoped teacher cannot act on school setup");
assert.equal(canSeeSetupGuidance(accountsAdminAcl), false, "Accounts admin is not a setup persona");

const schoolAdminNoScope: OnboardingAcl = { ...schoolAdminAcl, scopes: sectionScope };
assert.equal(canSeeSetupGuidance(schoolAdminNoScope), false, "School-scope is required");
assert.equal(canActOnSetupStep(schoolAdminNoScope, "classes"), false);

console.log("✓ Permission gating tests passed");

// ============================================================================
// 2. Deep links to existing management routes
// ============================================================================

assert.equal(SETUP_STEP_DEFINITIONS.academic_year.href, "/academic-years");
assert.equal(SETUP_STEP_DEFINITIONS.classes.href, "/classes");
assert.equal(SETUP_STEP_DEFINITIONS.sections.href, "/classes");
assert.equal(SETUP_STEP_DEFINITIONS.subjects.href, "/subjects");
assert.equal(SETUP_STEP_DEFINITIONS.teachers.href, "/teachers");
assert.equal(SETUP_STEP_DEFINITIONS.students.href, "/students");
assert.equal(SETUP_STEP_DEFINITIONS.branding.href, "/settings");

const linkedJourney = buildSetupJourney(superAdminAcl, {
  academicYearCount: 0,
  classCount: 0,
  sectionCount: 0,
  subjectCount: 0,
  teacherCount: 0,
  studentCount: 0,
  schoolName: "",
});
assert.deepEqual(
  linkedJourney.steps.map((step) => step.href),
  ["/academic-years", "/classes", "/classes", "/subjects", "/teachers", "/students", "/settings"],
);

console.log("✓ Deep-link tests passed");

// ============================================================================
// 3. Completion from real snapshot data (no fake KPIs / hardcoded ready)
// ============================================================================

const newSchool: SetupSnapshot = {
  academicYearCount: 1,
  classCount: 0,
  sectionCount: 0,
  subjectCount: 0,
  teacherCount: 0,
  studentCount: 0,
  schoolName: "New Pilot School",
};

assert.equal(evaluateStepCompletion("academic_year", newSchool), "complete");
assert.equal(evaluateStepCompletion("classes", newSchool), "incomplete");
assert.equal(evaluateStepCompletion("sections", newSchool), "incomplete");
assert.equal(evaluateStepCompletion("subjects", newSchool), "incomplete");
assert.equal(evaluateStepCompletion("teachers", newSchool), "incomplete");
assert.equal(evaluateStepCompletion("students", newSchool), "incomplete");
assert.equal(evaluateStepCompletion("branding", newSchool), "complete");

const newSchoolJourney = buildSetupJourney(superAdminAcl, newSchool);
assert.equal(newSchoolJourney.readyForOperations, false);
assert.equal(newSchoolJourney.completedCount, 2);
assert.equal(
  newSchoolJourney.steps.find((step) => step.id === "classes")?.status,
  "incomplete",
);

const classesWithoutSections: SetupSnapshot = {
  ...newSchool,
  classCount: 3,
  sectionCount: 0,
};
assert.equal(evaluateStepCompletion("classes", classesWithoutSections), "complete");
assert.equal(
  evaluateStepCompletion("sections", classesWithoutSections),
  "incomplete",
  "Classes and sections are independent steps",
);

const fullyConfigured: SetupSnapshot = {
  academicYearCount: 1,
  classCount: 8,
  sectionCount: 16,
  subjectCount: 12,
  teacherCount: 5,
  studentCount: 50,
  schoolName: "Arul Neri Academy",
};

const readyJourney = buildSetupJourney(superAdminAcl, fullyConfigured);
assert.equal(readyJourney.readyForOperations, true, "All required steps complete => ready for operations");
assert.equal(readyJourney.completedCount, 7);
assert.ok(
  readyJourney.steps.every((step) => step.status === "complete"),
);
assert.equal(
  readyJourney.steps.find((step) => step.id === "branding")?.detail,
  "Identity set: Arul Neri Academy",
);

const schoolAdminReady = buildSetupJourney(schoolAdminAcl, fullyConfigured);
assert.equal(schoolAdminReady.readyForOperations, true);
assert.equal(schoolAdminReady.steps.some((step) => step.id === "academic_year"), false);
assert.equal(schoolAdminReady.completedCount, 6);

const missingName: SetupSnapshot = { ...fullyConfigured, schoolName: "   " };
assert.equal(evaluateStepCompletion("branding", missingName), "incomplete");
assert.equal(buildSetupJourney(superAdminAcl, missingName).readyForOperations, false);

console.log("✓ Completion logic tests passed");

// ============================================================================
// 4. Failed fetches stay unknown — never masked as 0 / incomplete
// ============================================================================

const unknownSnapshot = emptySetupSnapshot();
assert.equal(evaluateStepCompletion("classes", unknownSnapshot), "unknown");
assert.equal(evaluateStepCompletion("students", unknownSnapshot), "unknown");
assert.equal(evaluateStepCompletion("branding", unknownSnapshot), "unknown");
assert.equal(
  buildSetupJourney(superAdminAcl, unknownSnapshot).readyForOperations,
  false,
  "Unknown data must not produce a ready state",
);

const successEval = evaluateSetupSnapshot({
  years: { status: "fulfilled", value: [{ id: "y1" }] },
  classes: { status: "fulfilled", value: [] },
  sections: { status: "fulfilled", value: [] },
  subjects: { status: "fulfilled", value: [] },
  teachers: { status: "fulfilled", value: [] },
  students: { status: "fulfilled", value: [] },
  branding: { status: "fulfilled", value: { schoolName: "Pilot" } },
});
assert.equal(successEval.loadState, "success");
assert.equal(successEval.snapshot.classCount, 0, "Legitimate empty class list is 0, not unknown");
assert.equal(evaluateStepCompletion("classes", successEval.snapshot), "incomplete");
assert.equal(evaluateStepCompletion("academic_year", successEval.snapshot), "complete");

const partialEval = evaluateSetupSnapshot({
  years: { status: "fulfilled", value: [{ id: "y1" }] },
  classes: { status: "rejected", reason: new Error("timeout") },
  sections: { status: "fulfilled", value: [{ id: "s1" }] },
  subjects: { status: "fulfilled", value: [{ id: "sub1" }] },
  teachers: { status: "fulfilled", value: [{ id: "t1" }] },
  students: { status: "fulfilled", value: [{ id: "st1" }] },
  branding: { status: "fulfilled", value: { schoolName: "Pilot" } },
});
assert.equal(partialEval.loadState, "partial");
assert.equal(partialEval.snapshot.classCount, null, "Rejected class list MUST be null, not 0");
assert.notEqual(partialEval.snapshot.classCount, 0);
assert.deepEqual(partialEval.failedFields, ["classes"]);
assert.equal(evaluateStepCompletion("classes", partialEval.snapshot), "unknown");
assert.equal(
  buildSetupJourney(superAdminAcl, partialEval.snapshot).readyForOperations,
  false,
);

const failureEval = evaluateSetupSnapshot({
  years: { status: "rejected", reason: new Error("down") },
  classes: { status: "rejected", reason: new Error("down") },
  sections: { status: "rejected", reason: new Error("down") },
});
assert.equal(failureEval.loadState, "failure");
assert.equal(failureEval.snapshot.academicYearCount, null);
assert.equal(failureEval.snapshot.classCount, null);

const omittedEval = evaluateSetupSnapshot({
  classes: { status: "fulfilled", value: [{ id: "c1" }] },
  sections: { status: "fulfilled", value: [{ id: "s1" }] },
});
assert.equal(omittedEval.loadState, "success");
assert.equal(omittedEval.snapshot.academicYearCount, null, "Unrequested fields stay unused");
assert.equal(omittedEval.failedFields.length, 0);

const schoolAdminPartialJourney = buildSetupJourney(schoolAdminAcl, partialEval.snapshot);
assert.equal(
  schoolAdminPartialJourney.steps.find((step) => step.id === "classes")?.status,
  "unknown",
);

console.log("✓ Unknown vs incomplete (no silent 0 masking) tests passed");

// ============================================================================
// 5. Multi-role: teacher + admin still sees setup; teacher-only does not
// ============================================================================

const teacherPlusAdmin: OnboardingAcl = {
  roles: [ROLE_CODES.TEACHER, ROLE_CODES.SCHOOL_ADMIN],
  permissions: schoolAdminAcl.permissions,
  scopes: schoolScope,
};
assert.equal(canSeeSetupGuidance(teacherPlusAdmin), true);
assert.equal(canActOnSetupStep(teacherPlusAdmin, "classes"), true);

console.log("✓ Multi-role setup visibility tests passed");

console.log("\n========================================================");
console.log("ALL WEB-ONBOARDING-001 SETUP GUIDANCE TESTS PASSED");
console.log("========================================================\n");
