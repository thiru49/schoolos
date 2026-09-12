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
      list: (query: { studentId?: string; sectionId?: string; date?: string }) => {
        const q = new URLSearchParams();
        if (query.studentId) q.set("studentId", query.studentId);
        if (query.sectionId) q.set("sectionId", query.sectionId);
        if (query.date) q.set("date", query.date);
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
    setTokens,
  };
}

export type SchoolosApi = ReturnType<typeof createApiClient>;
