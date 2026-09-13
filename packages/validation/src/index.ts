import { ATTENDANCE_STATUSES } from "@schoolos/permissions";
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

export const brandingUpdateSchema = z.object({
  schoolName: z.string().min(1).optional(),
  tagline: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  receiptPrefix: z.string().min(1).optional(),
  defaultLanguage: z.string().min(2).optional(),
  attendanceMode: z.enum(["daily"]).optional(),
  theme: z
    .object({
      primary: z.string(),
      primaryDark: z.string(),
      accent: z.string(),
      background: z.string(),
      success: z.string(),
      warning: z.string(),
      danger: z.string(),
    })
    .optional(),
  typography: z.record(z.unknown()).optional(),
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

export const subjectCreateSchema = z.object({
  name: z.string().min(1),
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
  note: z.string().optional(),
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

export type LoginInput = z.infer<typeof loginSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
