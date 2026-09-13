import { getAccessToken } from "../../lib/session";

export async function downloadReceiptPdf(receiptId: string, receiptNumber: string): Promise<void> {
  const token = getAccessToken();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const res = await fetch(`${baseUrl}/receipts/${receiptId}/pdf`, {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });

  if (!res.ok) {
    throw new Error(res.status === 404 ? "Receipt PDF not found" : "Failed to download receipt PDF");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeFilename = `receipt-${receiptNumber.replace(/\//g, "-")}.pdf`;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
