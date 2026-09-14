import assert from "node:assert/strict";
import { PERMISSIONS, ROLE_CODES } from "@schoolos/permissions";
import {
  canAssignRoles,
  canGrantRole,
  canViewRoles,
  checkRolesRouteAccess,
  hasSchoolScope,
  type RolesAcl,
} from "../features/rbac/roles-policy";

console.log("Starting ACL-002 Web Roles Logic & Validation Tests...");

// ============================================================================
// 1. Sidebar Navigation & Route Access Gating
// ============================================================================
const superAdminAcl: RolesAcl = {
  roles: [ROLE_CODES.SCHOOL_SUPER_ADMIN],
  permissions: [
    PERMISSIONS.ROLES_ASSIGN,
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.STUDENTS_WRITE,
    PERMISSIONS.TEACHERS_READ,
  ],
  scopes: [{ type: "school" }],
};

const teacherAcl: RolesAcl = {
  roles: [ROLE_CODES.TEACHER],
  permissions: [PERMISSIONS.TEACHERS_READ, PERMISSIONS.STUDENTS_READ],
  scopes: [{ type: "section", sectionId: "sec-8a" }],
};

const limitedAdminAcl: RolesAcl = {
  roles: [ROLE_CODES.SCHOOL_ADMIN],
  permissions: [PERMISSIONS.ROLES_ASSIGN],
  scopes: [{ type: "section", sectionId: "sec-8a" }], // lacks school scope
};

// Test canAssignRoles
assert.equal(canAssignRoles(superAdminAcl), true, "Super admin with school scope can assign roles");
assert.equal(canAssignRoles(teacherAcl), false, "Teacher without roles.assign cannot assign roles");
assert.equal(canAssignRoles(limitedAdminAcl), false, "User with roles.assign but lacking school scope cannot assign roles");

// Test checkRolesRouteAccess
const adminAccess = checkRolesRouteAccess("/roles", superAdminAcl);
assert.equal(adminAccess.allowed, true, "Super admin can access /roles route");

const teacherAccess = checkRolesRouteAccess("/roles", teacherAcl);
assert.equal(teacherAccess.allowed, false, "Teacher access to /roles route denied");
assert.ok(teacherAccess.reason?.includes("Missing permission"), "Denial reason mentions permission or scope");

const limitedAccess = checkRolesRouteAccess("/roles", limitedAdminAcl);
assert.equal(limitedAccess.allowed, false, "User without school scope denied /roles route");

console.log("✓ Sidebar navigation & route access tests passed");

// ============================================================================
// 2. Privilege Escalation Prevention (canGrantRole)
// ============================================================================
// Cannot grant platform_owner under any circumstances
assert.equal(
  canGrantRole(superAdminAcl, { code: ROLE_CODES.PLATFORM_OWNER, permissions: [PERMISSIONS.ROLES_ASSIGN] }),
  false,
  "Cannot grant platform_owner role",
);

// Super admin can grant Teacher role because all teacher permissions are held
const teacherRole = {
  code: ROLE_CODES.TEACHER,
  permissions: [PERMISSIONS.STUDENTS_READ, PERMISSIONS.TEACHERS_READ],
};
assert.equal(canGrantRole(superAdminAcl, teacherRole), true, "Can grant Teacher role when possessing its permissions");

// Cannot grant Accounts Admin role if caller lacks FEES_RECORD or other accounts permissions
const accountsRole = {
  code: ROLE_CODES.ACCOUNTS_ADMIN,
  permissions: [PERMISSIONS.FEES_RECORD, PERMISSIONS.STUDENTS_READ],
};
assert.equal(
  canGrantRole(superAdminAcl, accountsRole),
  false,
  "Cannot grant role containing unpossessed permissions",
);

console.log("✓ Privilege escalation prevention tests passed");

// ============================================================================
// 3. Scope Evaluation
// ============================================================================
assert.equal(hasSchoolScope(superAdminAcl), true);
assert.equal(hasSchoolScope(teacherAcl), false);
assert.equal(hasSchoolScope(limitedAdminAcl), false);

console.log("✓ Scope evaluation tests passed");

console.log("========================================================");
console.log("ALL ACL-002 WEB ROLES TESTS PASSED");
console.log("========================================================");
