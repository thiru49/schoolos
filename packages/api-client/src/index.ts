import type {
  AclPayload,
  BrandingPayload,
  LinkedChild,
  LoginRequest,
  PutAttendanceRequest,
  TokenPair,
} from "@schoolos/types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Tokens = { accessToken: string | null; refreshToken: string | null };

export function createApiClient(options: {
  baseUrl: string;
  getTokens: () => Tokens;
  setTokens?: (tokens: Tokens) => void;
}) {
  const { baseUrl, getTokens, setTokens } = options;

  async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (auth) {
      const { accessToken } = getTokens();
      if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    }
    const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
    if (!res.ok) {
      let message = res.statusText;
      try {
        const body = (await res.json()) as { message?: string };
        if (body.message) message = body.message;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, message);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    branding: {
      get: (slug: string) =>
        request<BrandingPayload>(`/public/tenants/${encodeURIComponent(slug)}/branding`, {}, false),
    },
    auth: {
      login: (body: LoginRequest) =>
        request<TokenPair & { user: { id: string; displayName: string; identifier: string } }>(
          "/auth/login",
          { method: "POST", body: JSON.stringify(body) },
          false,
        ),
      logout: () => request<void>("/auth/logout", { method: "POST" }),
      refresh: (refreshToken: string) =>
        request<TokenPair>(
          "/auth/refresh",
          { method: "POST", body: JSON.stringify({ refreshToken }) },
          false,
        ),
    },
    me: {
      get: () => request<{ id: string; displayName: string; identifier: string; schoolId: string }>("/me"),
      acl: () => request<AclPayload>("/me/acl"),
      children: () => request<LinkedChild[]>("/me/children"),
      selectChild: (studentId: string) =>
        request<{ studentId: string }>("/me/children/select", {
          method: "POST",
          body: JSON.stringify({ studentId }),
        }),
    },
    academics: {
      sections: () =>
        request<{ id: string; name: string; classId: string; className: string; label: string }[]>(
          "/academics/sections",
        ),
    },
    attendanceApi: {
      roster: (sectionId: string, date: string) =>
        request<{
          sectionId: string;
          date: string;
          className: string;
          sectionName: string;
          rows: {
            studentId: string;
            fullName: string;
            admissionNumber: string;
            status: string | null;
          }[];
        }>(`/attendance/roster?sectionId=${sectionId}&date=${date}`),
      mark: (body: PutAttendanceRequest) =>
        request<{ saved: number; absencesEnqueued: number }>("/attendance", {
          method: "PUT",
          body: JSON.stringify(body),
        }),
      report: (sectionId: string, from: string, to: string) =>
        request<{
          sectionId: string;
          label: string;
          from: string;
          to: string;
          rows: {
            studentId: string;
            fullName: string;
            admissionNumber: string;
            P: number;
            A: number;
            L: number;
            H: number;
          }[];
        }>(`/attendance/report?sectionId=${sectionId}&from=${from}&to=${to}`),
      exportUrl: (sectionId: string, date: string) =>
        `/attendance/export?sectionId=${sectionId}&date=${date}`,
      exportRangeUrl: (sectionId: string, from: string, to: string) =>
        `/attendance/export?sectionId=${sectionId}&from=${from}&to=${to}`,
      list: (query: {
        studentId?: string;
        sectionId?: string;
        date?: string;
        from?: string;
        to?: string;
      }) => {
        const q = new URLSearchParams();
        if (query.studentId) q.set("studentId", query.studentId);
        if (query.sectionId) q.set("sectionId", query.sectionId);
        if (query.date) q.set("date", query.date);
        if (query.from) q.set("from", query.from);
        if (query.to) q.set("to", query.to);
        return request<{
          records: {
            studentId: string;
            fullName: string;
            date: string;
            status: string;
          }[];
        }>(`/attendance?${q.toString()}`);
      },
    },
    subjects: {
      list: () => request<{ id: string; name: string }[]>("/subjects"),
      create: (name: string) => request<{ id: string; name: string }>("/subjects", { method: "POST", body: JSON.stringify({ name }) }),
    },
    timetable: {
      list: (query?: { sectionId?: string; weekday?: number; studentId?: string }) => {
        const q = new URLSearchParams();
        if (query?.sectionId) q.set("sectionId", query.sectionId);
        if (query?.weekday) q.set("weekday", String(query.weekday));
        if (query?.studentId) q.set("studentId", query.studentId);
        return request<
          {
            id: string;
            weekday: number;
            startTime: string;
            endTime: string;
            published: boolean;
            subjectName: string;
            teacherName: string;
            label: string;
            subjectId: string;
            teacherId: string;
            sectionId: string;
            classId: string;
          }[]
        >(`/timetable?${q.toString()}`);
      },
      create: (body: {
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string;
        weekday: number;
        startTime: string;
        endTime: string;
      }) => request<unknown>("/timetable", { method: "POST", body: JSON.stringify(body) }),
      publish: (sectionId: string) =>
        request<{ published: number }>("/timetable/publish", { method: "POST", body: JSON.stringify({ sectionId }) }),
      update: (
        id: string,
        body: { subjectId?: string; teacherId?: string; weekday?: number; startTime?: string; endTime?: string },
      ) => request<unknown>(`/timetable/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
      remove: (id: string) => request<{ deleted: boolean }>(`/timetable/${id}`, { method: "DELETE" }),
    },
    fees: {
      heads: () => request<{ id: string; name: string; amount: number }[]>("/fee-heads"),
      createHead: (body: { name: string; amount: number }) =>
        request<{ id: string; name: string; amount: number }>("/fee-heads", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      list: (studentId?: string) =>
        request<
          {
            id: string;
            amount: number;
            method: string;
            feeHeadName: string;
            studentName: string;
            admissionNumber: string;
            receiptNumber: string | null;
            receiptId: string | null;
            createdAt: string;
          }[]
        >(`/fees${studentId ? `?studentId=${studentId}` : ""}`),
      summary: (studentId?: string) =>
        request<{
          studentId: string;
          studentName: string;
          headsTotal: number;
          paidTotal: number;
          dues: number;
        }>(`/fees/summary${studentId ? `?studentId=${studentId}` : ""}`),
      previewNumber: () => request<{ preview: string }>("/fees/preview-number"),
      record: (body: {
        studentId: string;
        feeHeadId: string;
        amount: number;
        method: "cash" | "upi" | "bank";
        note?: string;
      }) => request<{ receiptNumber: string }>("/fees", { method: "POST", body: JSON.stringify(body) }),
      receipt: (id: string) =>
        request<{
          id: string;
          number: string;
          amount: number;
          method: string;
          feeHead: string;
          studentName: string;
          admissionNumber: string;
          createdAt: string;
          note: string | null;
        }>(`/receipts/${id}`),
    },
    exams: {
      list: (query?: { sectionId?: string; studentId?: string }) => {
        const q = new URLSearchParams();
        if (query?.sectionId) q.set("sectionId", query.sectionId);
        if (query?.studentId) q.set("studentId", query.studentId);
        return request<
          {
            id: string;
            name: string;
            examDate: string;
            maxScore: number;
            subjectName: string;
            label: string;
            sectionId: string;
            classId: string;
            subjectId: string;
          }[]
        >(`/exams?${q.toString()}`);
      },
      get: (id: string) =>
        request<{
          id: string;
          name: string;
          examDate: string;
          maxScore: number;
          subjectName: string;
          label: string;
          sectionId: string;
          classId: string;
          subjectId: string;
        }>(`/exams/${id}`),
      create: (body: {
        classId: string;
        sectionId: string;
        subjectId: string;
        name: string;
        examDate: string;
        maxScore: number;
      }) => request<unknown>("/exams", { method: "POST", body: JSON.stringify(body) }),
      queue: () =>
        request<{ id: string; name: string; subjectName: string; label: string; submittedCount: number }[]>(
          "/exams/queue",
        ),
      marks: (examId: string, studentId?: string) =>
        request<{
          exam: { id: string; name: string; maxScore: number; subjectName: string; label: string };
          rows: { studentId: string; fullName: string; admissionNumber: string; score: number | null; status: string | null }[];
        }>(`/exams/${examId}/marks${studentId ? `?studentId=${studentId}` : ""}`),
      draft: (examId: string, marks: { studentId: string; score: number }[]) =>
        request<unknown>(`/exams/${examId}/marks`, { method: "PUT", body: JSON.stringify({ marks }) }),
      submit: (examId: string) => request<{ submitted: number }>(`/exams/${examId}/marks/submit`, { method: "POST" }),
      publish: (examId: string) => request<{ published: number }>(`/exams/${examId}/marks/publish`, { method: "POST" }),
      reportCard: (studentId?: string) =>
        request<{
          schoolName: string;
          logoUrl: string | null;
          studentId: string;
          studentName: string;
          classSection: string;
          academicYear: string;
          rows: { exam: string; subject: string; score: number; maxScore: number }[];
        }>(`/exams/report-card${studentId ? `?studentId=${studentId}` : ""}`),
      enqueueReportCardPdf: (studentId?: string) =>
        request<{ queued: boolean; studentId: string }>("/exams/report-card/pdf", {
          method: "POST",
          body: JSON.stringify({ studentId }),
        }),
      reportCardPdfUrl: (studentId?: string) =>
        `/exams/report-card/pdf${studentId ? `?studentId=${studentId}` : ""}`,
    },
    homework: {
      list: (query?: { sectionId?: string; studentId?: string }) => {
        const q = new URLSearchParams();
        if (query?.sectionId) q.set("sectionId", query.sectionId);
        if (query?.studentId) q.set("studentId", query.studentId);
        return request<
          {
            id: string;
            title: string;
            body: string;
            dueDate: string;
            sectionId: string;
            classId: string;
            label: string;
            completed?: boolean;
            completionCount: number;
          }[]
        >(`/homework?${q.toString()}`);
      },
      get: (id: string) =>
        request<{
          id: string;
          title: string;
          body: string;
          dueDate: string;
          sectionId: string;
          classId: string;
          label: string;
          completed?: boolean;
          completionCount: number;
        }>(`/homework/${id}`),
      create: (body: { classId: string; sectionId: string; title: string; body: string; dueDate: string }) =>
        request<unknown>("/homework", { method: "POST", body: JSON.stringify(body) }),
      update: (id: string, body: { title?: string; body?: string; dueDate?: string }) =>
        request<unknown>(`/homework/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
      complete: (id: string) => request<unknown>(`/homework/${id}/complete`, { method: "POST" }),
    },
    students: {
      list: (query?: { sectionId?: string; q?: string }) => {
        const q = new URLSearchParams();
        if (query?.sectionId) q.set("sectionId", query.sectionId);
        if (query?.q) q.set("q", query.q);
        return request<
          {
            id: string;
            admissionNumber: string;
            fullName: string;
            classId: string;
            sectionId: string;
            className: string;
            sectionName: string;
            status: string;
            label: string;
          }[]
        >(`/students?${q.toString()}`);
      },
      get: (id: string) =>
        request<{
          id: string;
          admissionNumber: string;
          fullName: string;
          classId: string;
          sectionId: string;
          className: string;
          sectionName: string;
          status: string;
          label: string;
        }>(`/students/${id}`),
      create: (body: {
        admissionNumber: string;
        fullName: string;
        classId: string;
        sectionId: string;
        password: string;
      }) => request<unknown>("/students", { method: "POST", body: JSON.stringify(body) }),
      update: (id: string, body: { fullName?: string; classId?: string; sectionId?: string }) =>
        request<unknown>(`/students/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    },
    parents: {
      list: (q?: string) =>
        request<
          {
            id: string;
            fullName: string;
            contact: string | null;
            children: { studentId: string; fullName: string; admissionNumber: string }[];
          }[]
        >(`/parents${q ? `?q=${encodeURIComponent(q)}` : ""}`),
      get: (id: string) =>
        request<{
          id: string;
          fullName: string;
          contact: string | null;
          children: { studentId: string; fullName: string; admissionNumber: string }[];
        }>(`/parents/${id}`),
      create: (body: { fullName: string; contact: string; password: string; studentIds?: string[] }) =>
        request<unknown>("/parents", { method: "POST", body: JSON.stringify(body) }),
      update: (id: string, body: { fullName?: string; contact?: string }) =>
        request<unknown>(`/parents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
      link: (id: string, studentId: string) =>
        request<unknown>(`/parents/${id}/children`, { method: "POST", body: JSON.stringify({ studentId }) }),
      unlink: (id: string, studentId: string) =>
        request<unknown>(`/parents/${id}/children/${studentId}`, { method: "DELETE" }),
    },
    teachers: {
      list: (q?: string) =>
        request<{ id: string; employeeId: string; fullName: string; sections: string[] }[]>(
          `/teachers${q ? `?q=${encodeURIComponent(q)}` : ""}`,
        ),
      get: (id: string) =>
        request<{ id: string; employeeId: string; fullName: string; sections: string[] }>(`/teachers/${id}`),
      create: (body: {
        employeeId: string;
        fullName: string;
        password: string;
        classId?: string;
        sectionId?: string;
      }) => request<unknown>("/teachers", { method: "POST", body: JSON.stringify(body) }),
      update: (id: string, body: { fullName?: string }) =>
        request<unknown>(`/teachers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    },
    notifications: {
      list: () =>
        request<{ id: string; kind: string; title: string; body: string; read: boolean; createdAt: string }[]>(
          "/notifications",
        ),
      markRead: (id: string) => request<{ id: string; read: boolean }>(`/notifications/${id}/read`, { method: "PATCH" }),
      savePushToken: (token: string) =>
        request<{ saved: boolean }>("/me/push-token", { method: "POST", body: JSON.stringify({ token }) }),
    },
    notices: {
      list: () =>
        request<
          {
            id: string;
            title: string;
            body: string;
            targetRole: string | null;
            published: boolean;
            publishedAt: string;
            authorId: string;
            authorName: string;
            createdAt: string;
          }[]
        >("/notices"),
      create: (body: {
        title: string;
        body: string;
        targetRole?: "all" | "student" | "parent" | "teacher" | null;
        published?: boolean;
      }) =>
        request<{
          id: string;
          title: string;
          body: string;
          targetRole: string | null;
          published: boolean;
          publishedAt: string;
          authorId: string;
          authorName: string;
          createdAt: string;
        }>("/notices", { method: "POST", body: JSON.stringify(body) }),
      update: (
        id: string,
        body: {
          title?: string;
          body?: string;
          targetRole?: "all" | "student" | "parent" | "teacher" | null;
          published?: boolean;
        },
      ) =>
        request<{
          id: string;
          title: string;
          body: string;
          targetRole: string | null;
          published: boolean;
          publishedAt: string;
          authorId: string;
          authorName: string;
          createdAt: string;
        }>(`/notices/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
      remove: (id: string) =>
        request<{ deleted: boolean }>(`/notices/${id}`, { method: "DELETE" }),
    },
    events: {
      list: (query?: { from?: string; to?: string }) => {
        const q = new URLSearchParams();
        if (query?.from) q.set("from", query.from);
        if (query?.to) q.set("to", query.to);
        const qs = q.toString();
        return request<
          {
            id: string;
            title: string;
            description: string | null;
            startDate: string;
            endDate: string;
            location: string | null;
            published: boolean;
            createdAt: string;
          }[]
        >(`/events${qs ? `?${qs}` : ""}`);
      },
      create: (body: {
        title: string;
        description?: string | null;
        startDate: string;
        endDate: string;
        location?: string | null;
        published?: boolean;
      }) =>
        request<{
          id: string;
          title: string;
          description: string | null;
          startDate: string;
          endDate: string;
          location: string | null;
          published: boolean;
          createdAt: string;
        }>("/events", { method: "POST", body: JSON.stringify(body) }),
      update: (
        id: string,
        body: {
          title?: string;
          description?: string | null;
          startDate?: string;
          endDate?: string;
          location?: string | null;
          published?: boolean;
        },
      ) =>
        request<{
          id: string;
          title: string;
          description: string | null;
          startDate: string;
          endDate: string;
          location: string | null;
          published: boolean;
          createdAt: string;
        }>(`/events/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
      remove: (id: string) =>
        request<{ deleted: boolean }>(`/events/${id}`, { method: "DELETE" }),
    },
    holidays: {
      list: () =>
        request<{ id: string; name: string; date: string; createdAt: string }[]>("/holidays"),
      create: (body: { name: string; date: string }) =>
        request<{ id: string; name: string; date: string; createdAt: string }>("/holidays", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      remove: (id: string) =>
        request<{ deleted: boolean }>(`/holidays/${id}`, { method: "DELETE" }),
    },
    setTokens,
  };
}

export type SchoolosApi = ReturnType<typeof createApiClient>;
