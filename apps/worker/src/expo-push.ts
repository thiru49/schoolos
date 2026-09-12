export type ExpoPushOutcome = {
  ok: boolean;
  retry: boolean;
  unregister: boolean;
  message: string;
};

type ExpoTicket = {
  status?: string;
  message?: string;
  details?: { error?: string };
};

function ticketsFromBody(body: unknown): ExpoTicket[] {
  if (!body || typeof body !== "object") return [];
  const data = (body as { data?: unknown }).data;
  if (Array.isArray(data)) return data as ExpoTicket[];
  if (data && typeof data === "object") return [data as ExpoTicket];
  return [];
}

export function classifyExpoPushResponse(httpStatus: number, body: unknown): ExpoPushOutcome {
  if (httpStatus === 429 || httpStatus >= 500) {
    return { ok: false, retry: true, unregister: false, message: `Expo push HTTP ${httpStatus}` };
  }

  const tickets = ticketsFromBody(body);
  const errors = tickets.filter((t) => t.status === "error");
  const unregister = errors.some((t) => t.details?.error === "DeviceNotRegistered");

  if (unregister) {
    return {
      ok: false,
      retry: false,
      unregister: true,
      message: errors[0]?.message ?? "DeviceNotRegistered",
    };
  }

  if (httpStatus >= 400) {
    return { ok: false, retry: false, unregister: false, message: `Expo push HTTP ${httpStatus}` };
  }

  if (errors.length > 0) {
    return {
      ok: false,
      retry: true,
      unregister: false,
      message: errors[0]?.message ?? "Expo push rejected",
    };
  }

  return { ok: true, retry: false, unregister: false, message: "ok" };
}
