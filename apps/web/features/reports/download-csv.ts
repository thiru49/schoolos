import { getAccessToken } from "../../lib/session";

export async function downloadReportCsv(path: string, filename: string) {
  const token = getAccessToken();
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) {
    throw new Error("Export failed");
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}
