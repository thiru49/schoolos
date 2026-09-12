import { getAccessToken } from "../../lib/session";

export async function downloadAttendanceCsv(path: string, filename: string) {
  const token = getAccessToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}${path}`, {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) {
    throw new Error("Export failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
