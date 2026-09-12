import type {
  AttendanceStatus,
  PermissionCode,
  RoleCode,
  ScopeType,
} from "@schoolos/permissions";

export type { AttendanceStatus, PermissionCode, RoleCode, ScopeType };

export type BrandingTheme = {
  primary: string;
  primaryDark: string;
  accent: string;
  background: string;
  success: string;
  warning: string;
  danger: string;
};

export type BrandingTypography = {
  preset: string;
  source: "google" | "file";
  families: {
    display: string;
    body: string;
    tamil: string;
  };
  googleFamilies: string[];
  files: {
    displayRegular: string | null;
    displayBold: string | null;
    bodyRegular: string | null;
    bodyBold: string | null;
    tamilRegular: string | null;
  };
  scale: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    display: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
  weights: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  letterSpacing: {
    display: number;
    body: number;
  };
};

export type BrandingPayload = {
  tenantId: string;
  slug: string;
  schoolName: string;
  tagline: string;
  location: string;
  logoUrl: string | null;
  poweredBy: string;
  theme: BrandingTheme;
  typography: BrandingTypography;
  receiptPrefix: string;
  defaultLanguage: string;
  attendanceMode: string;
};

export type AclScope = {
  type: ScopeType;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  studentId?: string;
};

export type AclPayload = {
  userId: string;
  schoolId: string;
  roles: RoleCode[];
  permissions: PermissionCode[];
  scopes: AclScope[];
};

export type LoginRequest = {
  slug: string;
  roleHint?: RoleCode;
  identifier: string;
  password: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type AttendanceMarkItem = {
  studentId: string;
  status: AttendanceStatus;
};

export type PutAttendanceRequest = {
  sectionId: string;
  date: string;
  marks: AttendanceMarkItem[];
};

export type AttendanceRosterRow = {
  studentId: string;
  fullName: string;
  admissionNumber: string;
  rollOrder: number;
  status: AttendanceStatus | null;
};

export type LinkedChild = {
  studentId: string;
  fullName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
};
