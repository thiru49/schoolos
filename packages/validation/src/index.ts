import { ATTENDANCE_STATUSES, SCOPE_TYPES } from "@schoolos/permissions";
import { z } from "zod";

export const loginSchema = z.object({
  slug: z.string().min(1),
  roleHint: z
    .enum([
      "school_super_admin",
      "school_admin",
      "accounts_admin",
      "academic_admin",
      "teacher",
      "parent",
      "student",
    ])
    .optional(),
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const markAttendanceSchema = z.object({
  sectionId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  marks: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: z.enum(ATTENDANCE_STATUSES),
      }),
    )
    .min(1),
});

export const attendanceQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const rosterQuerySchema = z.object({
  sectionId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const attendanceReportSchema = z.object({
  sectionId: z.string().uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const pushTokenSchema = z.object({
  token: z.string().min(1),
});

export const selectChildSchema = z.object({
  studentId: z.string().uuid(),
});

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color like #0B3A6E");

const fontAllowlist = [
  "Plus Jakarta Sans",
  "Inter",
  "Poppins",
  "Nunito",
  "Noto Sans",
  "Noto Sans Tamil",
  "Hind Madurai",
  "Roboto",
  "Open Sans",
] as const;

export const brandingThemeUpdateSchema = z.object({
  primary: hexColorSchema.optional(),
  primaryDark: hexColorSchema.optional(),
  accent: hexColorSchema.optional(),
  background: hexColorSchema.optional(),
  success: hexColorSchema.optional(),
  warning: hexColorSchema.optional(),
  danger: hexColorSchema.optional(),
});

export const brandingTypographyUpdateSchema = z.object({
  preset: z.enum(["arulneri", "modern", "classic", "tamil-first"]).optional(),
  families: z
    .object({
      display: z.enum(fontAllowlist).optional(),
      body: z.enum(fontAllowlist).optional(),
      tamil: z.enum(fontAllowlist).optional(),
    })
    .optional(),
  scale: z
    .object({
      md: z.number().int().min(12).max(20),
    })
    .optional(),
});

export const brandingUpdateSchema = z.object({
  schoolName: z.string().trim().min(1).max(200).optional(),
  tagline: z.string().trim().min(1).max(500).optional(),
  location: z.string().trim().min(1).max(500).optional(),
  theme: brandingThemeUpdateSchema.optional(),
  typography: brandingTypographyUpdateSchema.optional(),
});

export const schoolSettingsUpdateSchema = z.object({
  receiptPrefix: z.string().trim().min(1).max(50).optional(),
  defaultLanguage: z.enum(["en", "ta"]).optional(),
  attendanceMode: z.enum(["daily"]).optional(),
});

export const studentCreateSchema = z.object({
  admissionNumber: z.string().min(1),
  fullName: z.string().min(1),
  classId: z.string().uuid(),
  sectionId: z.string().uuid(),
  password: z.string().min(8),
});

export const studentUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  classId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
});

export const parentCreateSchema = z.object({
  fullName: z.string().min(1),
  contact: z.string().min(1),
  password: z.string().min(8),
  studentIds: z.array(z.string().uuid()).optional(),
});

export const parentUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  contact: z.string().min(1).optional(),
});

export const parentLinkSchema = z.object({
  studentId: z.string().uuid(),
});

export const teacherCreateSchema = z.object({
  employeeId: z.string().min(1),
  fullName: z.string().min(1),
  password: z.string().min(8),
  classId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
});

export const teacherUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
});

export const academicYearCreateSchema = z.object({
  name: z.string().trim().min(1),
  isActive: z.boolean().optional(),
});

export const academicYearUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const classCreateSchema = z.object({
  academicYearId: z.string().uuid(),
  name: z.string().trim().min(1),
});

export const classUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  academicYearId: z.string().uuid().optional(),
});

export const sectionCreateSchema = z.object({
  classId: z.string().uuid(),
  name: z.string().trim().min(1),
});

export const sectionUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  classId: z.string().uuid().optional(),
});

export const subjectCreateSchema = z.object({
  name: z.string().trim().min(1),
});

export const subjectUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
});

export const timetablePeriodSchema = z.object({
  classId: z.string().uuid(),
  sectionId: z.string().uuid(),
  subjectId: z.string().uuid(),
  teacherId: z.string().uuid(),
  weekday: z.number().int().min(1).max(7),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const timetablePublishSchema = z.object({
  sectionId: z.string().uuid(),
});

export const timetablePeriodUpdateSchema = z.object({
  subjectId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  weekday: z.number().int().min(1).max(7).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export const examCreateSchema = z.object({
  classId: z.string().uuid(),
  sectionId: z.string().uuid(),
  subjectId: z.string().uuid(),
  name: z.string().min(1),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maxScore: z.number().int().positive(),
});

export const marksDraftSchema = z.object({
  marks: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        score: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const feeHeadCreateSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number().int().positive(),
});

export const feeRecordSchema = z.object({
  studentId: z.string().uuid(),
  feeHeadId: z.string().uuid(),
  amount: z.number().int().positive(),
  method: z.enum(["cash", "upi", "bank"]),
  note: z.string().trim().min(1).optional(),
});

export const homeworkCreateSchema = z.object({
  classId: z.string().uuid(),
  sectionId: z.string().uuid(),
  title: z.string().min(1),
  body: z.string().min(1),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const homeworkUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const NOTICE_TARGET_ROLES = ["all", "student", "parent", "teacher"] as const;
export type NoticeTargetRole = (typeof NOTICE_TARGET_ROLES)[number] | null;

export const noticeCreateSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  targetRole: z.enum(NOTICE_TARGET_ROLES).nullable().optional(),
  published: z.boolean().optional(),
});

export const noticeUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  body: z.string().trim().min(1).optional(),
  targetRole: z.enum(NOTICE_TARGET_ROLES).nullable().optional(),
  published: z.boolean().optional(),
});

export const eventCreateSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().nullable().optional(),
    startDate: z.string().trim().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid startDate format",
    }),
    endDate: z.string().trim().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid endDate format",
    }),
    location: z.string().trim().nullable().optional(),
    published: z.boolean().optional(),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: "startDate must be before or equal to endDate",
    path: ["endDate"],
  });

export const eventUpdateSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    startDate: z
      .string()
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid startDate format",
      })
      .optional(),
    endDate: z
      .string()
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid endDate format",
      })
      .optional(),
    location: z.string().trim().nullable().optional(),
    published: z.boolean().optional(),
  })
  .refine(
    (data) =>
      !data.startDate || !data.endDate || new Date(data.startDate) <= new Date(data.endDate),
    {
      message: "startDate must be before or equal to endDate",
      path: ["endDate"],
    },
  );

export const eventQuerySchema = z
  .object({
    from: z
      .string()
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid 'from' date format",
      })
      .optional(),
    to: z
      .string()
      .trim()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid 'to' date format",
      })
      .optional(),
  })
  .refine((data) => !data.from || !data.to || new Date(data.from) <= new Date(data.to), {
    message: "'from' date must be before or equal to 'to' date",
    path: ["to"],
  });

export const holidayCreateSchema = z.object({
  name: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  academicYearId: z.string().uuid().optional(),
});

export const feeCollectionReportQuerySchema = z.object({
  classId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
});

export const paymentReportQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    method: z.enum(["cash", "upi", "bank"]).optional(),
    studentId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
    sectionId: z.string().uuid().optional(),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: "'from' date must be before or equal to 'to' date",
    path: ["to"],
  });

export const studentListReportQuerySchema = z.object({
  classId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const teacherWorkloadReportQuerySchema = z.object({
  teacherId: z.string().uuid().optional(),
});

export const progressReportQuerySchema = z.object({
  classId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  examId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type NoticeCreateInput = z.infer<typeof noticeCreateSchema>;
export type NoticeUpdateInput = z.infer<typeof noticeUpdateSchema>;
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
export type HolidayCreateInput = z.infer<typeof holidayCreateSchema>;
export type FeeCollectionReportQuery = z.infer<typeof feeCollectionReportQuerySchema>;
export type PaymentReportQuery = z.infer<typeof paymentReportQuerySchema>;
export type StudentListReportQuery = z.infer<typeof studentListReportQuerySchema>;
export type TeacherWorkloadReportQuery = z.infer<typeof teacherWorkloadReportQuerySchema>;
export type ProgressReportQuery = z.infer<typeof progressReportQuerySchema>;

export const assignRolesSchema = z.object({
  roleCodes: z.array(z.string().min(1)).min(1, "At least one role code is required"),
});

export const userScopeItemSchema = z.object({
  scopeType: z.enum(SCOPE_TYPES),
  classId: z.string().uuid().nullable().optional(),
  sectionId: z.string().uuid().nullable().optional(),
  subjectId: z.string().uuid().nullable().optional(),
  studentId: z.string().uuid().nullable().optional(),
});

export const updateScopesSchema = z.object({
  scopes: z.array(userScopeItemSchema),
});

export const userListQuerySchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
});

export type AssignRolesInput = z.infer<typeof assignRolesSchema>;
export type UserScopeItemInput = z.infer<typeof userScopeItemSchema>;
export type UpdateScopesInput = z.infer<typeof updateScopesSchema>;
export type UserListQueryInput = z.infer<typeof userListQuerySchema>;
