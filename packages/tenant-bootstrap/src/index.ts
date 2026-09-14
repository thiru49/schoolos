import type { Prisma } from "@prisma/client";
import {
  PERMISSIONS,
  ROLE_CODES,
  type PermissionCode,
  type RoleCode,
} from "@schoolos/permissions";
import type { BrandingTheme, BrandingTypography } from "@schoolos/types";

const P = PERMISSIONS;

export const ROLE_PERMISSION_MATRIX: Record<
  Exclude<RoleCode, "platform_owner">,
  PermissionCode[]
> = {
  [ROLE_CODES.SCHOOL_SUPER_ADMIN]: [
    P.SCHOOL_SETTINGS_READ,
    P.SCHOOL_SETTINGS_UPDATE,
    P.SCHOOL_BRANDING_UPDATE,
    P.ACADEMIC_YEAR_MANAGE,
    P.ROLES_ASSIGN,
    P.ADMINS_CREATE,
    P.USERS_MANAGE_SUPER,
    P.STUDENTS_READ,
    P.STUDENTS_WRITE,
    P.PARENTS_READ,
    P.PARENTS_WRITE,
    P.TEACHERS_READ,
    P.TEACHERS_WRITE,
    P.CLASSES_MANAGE,
    P.SUBJECTS_MANAGE,
    P.TIMETABLE_READ,
    P.TIMETABLE_WRITE,
    P.ATTENDANCE_READ,
    P.ATTENDANCE_MARK,
    P.HOMEWORK_READ,
    P.HOMEWORK_CREATE,
    P.EXAMS_READ,
    P.EXAMS_WRITE,
    P.MARKS_DRAFT,
    P.MARKS_SUBMIT,
    P.MARKS_PUBLISH,
    P.MARKS_READ,
    P.FEES_READ,
    P.FEES_STRUCTURE_WRITE,
    P.FEES_RECORD,
    P.RECEIPTS_READ,
    P.NOTICES_WRITE,
    P.NOTICES_READ,
    P.EVENTS_WRITE,
    P.EVENTS_READ,
    P.HOLIDAYS_MANAGE,
    P.NOTIFICATIONS_SEND,
    P.REPORTS_ATTENDANCE,
    P.REPORTS_FEES,
    P.REPORTS_PROGRESS,
    P.AUDIT_READ,
  ],
  [ROLE_CODES.SCHOOL_ADMIN]: [
    P.SCHOOL_SETTINGS_READ,
    P.STUDENTS_READ,
    P.STUDENTS_WRITE,
    P.PARENTS_READ,
    P.PARENTS_WRITE,
    P.TEACHERS_READ,
    P.TEACHERS_WRITE,
    P.CLASSES_MANAGE,
    P.SUBJECTS_MANAGE,
    P.TIMETABLE_READ,
    P.TIMETABLE_WRITE,
    P.ATTENDANCE_READ,
    P.ATTENDANCE_MARK,
    P.HOMEWORK_READ,
    P.HOMEWORK_CREATE,
    P.EXAMS_READ,
    P.EXAMS_WRITE,
    P.MARKS_DRAFT,
    P.MARKS_SUBMIT,
    P.MARKS_PUBLISH,
    P.MARKS_READ,
    P.FEES_READ,
    P.FEES_STRUCTURE_WRITE,
    P.FEES_RECORD,
    P.RECEIPTS_READ,
    P.NOTICES_WRITE,
    P.NOTICES_READ,
    P.EVENTS_WRITE,
    P.EVENTS_READ,
    P.HOLIDAYS_MANAGE,
    P.NOTIFICATIONS_SEND,
    P.REPORTS_ATTENDANCE,
    P.REPORTS_FEES,
    P.REPORTS_PROGRESS,
  ],
  [ROLE_CODES.ACCOUNTS_ADMIN]: [
    P.SCHOOL_SETTINGS_READ,
    P.STUDENTS_READ,
    P.PARENTS_READ,
    P.FEES_READ,
    P.FEES_STRUCTURE_WRITE,
    P.FEES_RECORD,
    P.RECEIPTS_READ,
    P.NOTICES_READ,
    P.EVENTS_READ,
    P.NOTIFICATIONS_SEND,
    P.REPORTS_FEES,
  ],
  [ROLE_CODES.ACADEMIC_ADMIN]: [
    P.SCHOOL_SETTINGS_READ,
    P.STUDENTS_READ,
    P.TEACHERS_READ,
    P.CLASSES_MANAGE,
    P.SUBJECTS_MANAGE,
    P.TIMETABLE_READ,
    P.TIMETABLE_WRITE,
    P.ATTENDANCE_READ,
    P.HOMEWORK_READ,
    P.HOMEWORK_CREATE,
    P.EXAMS_READ,
    P.EXAMS_WRITE,
    P.MARKS_DRAFT,
    P.MARKS_SUBMIT,
    P.MARKS_PUBLISH,
    P.MARKS_READ,
    P.NOTICES_WRITE,
    P.NOTICES_READ,
    P.EVENTS_WRITE,
    P.EVENTS_READ,
    P.HOLIDAYS_MANAGE,
    P.NOTIFICATIONS_SEND,
    P.REPORTS_ATTENDANCE,
    P.REPORTS_PROGRESS,
  ],
  [ROLE_CODES.TEACHER]: [
    P.STUDENTS_READ,
    P.TEACHERS_READ,
    P.TIMETABLE_READ,
    P.ATTENDANCE_READ,
    P.ATTENDANCE_MARK,
    P.HOMEWORK_READ,
    P.HOMEWORK_CREATE,
    P.EXAMS_READ,
    P.MARKS_DRAFT,
    P.MARKS_SUBMIT,
    P.MARKS_READ,
    P.NOTICES_READ,
    P.EVENTS_READ,
    P.REPORTS_ATTENDANCE,
    P.REPORTS_PROGRESS,
  ],
  [ROLE_CODES.PARENT]: [
    P.STUDENTS_READ,
    P.PARENTS_READ,
    P.TIMETABLE_READ,
    P.ATTENDANCE_READ,
    P.HOMEWORK_READ,
    P.EXAMS_READ,
    P.MARKS_READ,
    P.FEES_READ,
    P.RECEIPTS_READ,
    P.NOTICES_READ,
    P.EVENTS_READ,
  ],
  [ROLE_CODES.STUDENT]: [
    P.STUDENTS_READ,
    P.TIMETABLE_READ,
    P.ATTENDANCE_READ,
    P.HOMEWORK_READ,
    P.HOMEWORK_COMPLETE,
    P.EXAMS_READ,
    P.MARKS_READ,
    P.FEES_READ,
    P.RECEIPTS_READ,
    P.NOTICES_READ,
    P.EVENTS_READ,
  ],
};

export const ROLE_NAMES: Record<Exclude<RoleCode, "platform_owner">, string> = {
  school_super_admin: "School Super Admin",
  school_admin: "School Admin",
  accounts_admin: "Accounts Admin",
  academic_admin: "Academic Admin",
  teacher: "Teacher",
  parent: "Parent",
  student: "Student",
};

export const DEFAULT_SCHOOL_THEME: BrandingTheme = {
  primary: "#0B3A6E",
  primaryDark: "#082A50",
  accent: "#E8A317",
  background: "#F4F7FB",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
};

export const SCHOOL_B_FIXTURE_THEME: BrandingTheme = {
  ...DEFAULT_SCHOOL_THEME,
  primary: "#14532D",
  primaryDark: "#052E16",
  accent: "#CA8A04",
};

export const DEFAULT_POWERED_BY = "CREOVY Digital Solutions";

const baseTypography = (
  preset: string,
  families: BrandingTypography["families"],
): BrandingTypography => ({
  preset,
  source: "google",
  families,
  googleFamilies: [
    `${families.display.replace(/ /g, "+")}:wght@400;500;600;700`,
    `${families.tamil.replace(/ /g, "+")}:wght@400;500;600;700`,
  ],
  files: {
    displayRegular: null,
    displayBold: null,
    bodyRegular: null,
    bodyBold: null,
    tamilRegular: null,
  },
  scale: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, display: 28 },
  lineHeight: { tight: 1.2, normal: 1.45, relaxed: 1.65 },
  weights: { regular: "400", medium: "500", semibold: "600", bold: "700" },
  letterSpacing: { display: 0, body: 0 },
});

const TYPOGRAPHY_PRESETS: Record<
  "arulneri" | "modern" | "classic" | "tamil-first",
  BrandingTypography
> = {
  arulneri: baseTypography("arulneri", {
    display: "Plus Jakarta Sans",
    body: "Plus Jakarta Sans",
    tamil: "Noto Sans Tamil",
  }),
  modern: baseTypography("modern", {
    display: "Inter",
    body: "Inter",
    tamil: "Noto Sans Tamil",
  }),
  classic: baseTypography("classic", {
    display: "Poppins",
    body: "Open Sans",
    tamil: "Noto Sans Tamil",
  }),
  "tamil-first": baseTypography("tamil-first", {
    display: "Hind Madurai",
    body: "Noto Sans",
    tamil: "Noto Sans Tamil",
  }),
};

export function defaultTypographyForPreset(
  preset: "arulneri" | "modern" | "classic" | "tamil-first" = "tamil-first",
): BrandingTypography {
  return { ...TYPOGRAPHY_PRESETS[preset] };
}

export const arulNeriTheme = DEFAULT_SCHOOL_THEME;
export const arulNeriTypography = defaultTypographyForPreset("arulneri");
export const schoolBTheme = SCHOOL_B_FIXTURE_THEME;

export const PROVISION_AUDIT_ACTION = "platform.school.provision";

type DbClient =
  | Prisma.TransactionClient
  | {
      permission: Prisma.PermissionDelegate;
      role: Prisma.RoleDelegate;
      rolePermission: Prisma.RolePermissionDelegate;
    };

export async function seedRolesForSchool(db: DbClient, schoolId: string): Promise<void> {
  const permissions = await db.permission.findMany();
  const byCode = new Map(permissions.map((p) => [p.code, p.id]));

  for (const [code, permCodes] of Object.entries(ROLE_PERMISSION_MATRIX)) {
    const role = await db.role.upsert({
      where: { schoolId_code: { schoolId, code } },
      update: { name: ROLE_NAMES[code as Exclude<RoleCode, "platform_owner">] },
      create: {
        schoolId,
        code,
        name: ROLE_NAMES[code as Exclude<RoleCode, "platform_owner">],
        isSystem: true,
      },
    });
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.rolePermission.createMany({
      data: permCodes.map((c) => {
        const permissionId = byCode.get(c);
        if (!permissionId) throw new Error(`Missing permission ${c}`);
        return { roleId: role.id, permissionId, schoolId };
      }),
    });
  }
}
