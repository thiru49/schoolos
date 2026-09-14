import assert from "node:assert/strict";
import { PERMISSIONS } from "@schoolos/permissions";
import {
  canManageAcademicYears,
  canManageClasses,
  canManageSubjects,
  checkAcademicsRouteAccess,
  hasSchoolScope,
} from "../features/academics/academics-policy";

console.log("Starting MST-002 Web Academics Logic Tests...");

const NAV = [
  { href: "/academic-years", permission: PERMISSIONS.ACADEMIC_YEAR_MANAGE },
  { href: "/classes", permission: PERMISSIONS.CLASSES_MANAGE },
  { href: "/subjects", permission: PERMISSIONS.SUBJECTS_MANAGE },
];

function filterSidebar(permissions: string[]) {
  return NAV.filter((item) => permissions.includes(item.permission));
}

assert.equal(filterSidebar([]).length, 0);
assert.equal(
  filterSidebar([PERMISSIONS.CLASSES_MANAGE, PERMISSIONS.SUBJECTS_MANAGE]).length,
  2,
);

const superAdminAcl = {
  permissions: [
    PERMISSIONS.ACADEMIC_YEAR_MANAGE,
    PERMISSIONS.CLASSES_MANAGE,
    PERMISSIONS.SUBJECTS_MANAGE,
  ],
  scopes: [{ type: "school" }],
};

assert.equal(canManageAcademicYears(superAdminAcl), true);
assert.equal(canManageClasses(superAdminAcl), true);
assert.equal(canManageSubjects(superAdminAcl), true);

const teacherAcl = {
  permissions: [PERMISSIONS.ATTENDANCE_READ],
  scopes: [{ type: "section" }],
};
assert.equal(canManageClasses(teacherAcl), false);
assert.equal(checkAcademicsRouteAccess("/classes", teacherAcl).allowed, false);

const sectionScopedAdmin = {
  permissions: [PERMISSIONS.CLASSES_MANAGE],
  scopes: [{ type: "section" }],
};
assert.equal(hasSchoolScope(sectionScopedAdmin), false);
assert.equal(canManageClasses(sectionScopedAdmin), false);

console.log("✓ MST-002 web academics policy tests passed");
