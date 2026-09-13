import * as FileSystem from "expo-file-system";
import { Share } from "react-native";
import { getAccess } from "../../services/storage";

export async function downloadMobileReceiptPdf(receiptId: string, receiptNumber: string): Promise<string> {
  const accessToken = await getAccess();
  if (!accessToken) {
    throw new Error("Authentication session missing. Please sign in again.");
  }

  const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
  const safeFilename = `receipt-${receiptNumber.replace(/\//g, "-")}.pdf`;
  const fileUri = `${FileSystem.cacheDirectory}${safeFilename}`;

  const result = await FileSystem.downloadAsync(
    `${baseUrl}/receipts/${receiptId}/pdf`,
    fileUri,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (result.status !== 200) {
    throw new Error(
      result.status === 404
        ? "Receipt PDF not found"
        : `Download failed with HTTP ${result.status}`,
    );
  }

  return result.uri;
}

export async function shareMobileReceipt(
  receipt: {
    id: string;
    number: string;
    studentName: string;
    admissionNumber?: string;
    feeHead: string;
    amount: number;
    method: string;
    createdAt: string;
  },
  localPdfUri?: string,
): Promise<void> {
  const formattedDate = new Date(receipt.createdAt).toLocaleDateString();
  const message = `Official Fee Receipt: ${receipt.number}\nStudent: ${receipt.studentName}${
    receipt.admissionNumber ? ` (${receipt.admissionNumber})` : ""
  }\nFee Head: ${receipt.feeHead}\nAmount: ₹${receipt.amount}\nPayment Method: ${receipt.method.toUpperCase()}\nDate: ${formattedDate}`;

  await Share.share({
    title: `Receipt ${receipt.number}`,
    message,
    url: localPdfUri,
  });
}
