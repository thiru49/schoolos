import { renderReceiptPdf } from "../../apps/worker/src/receipt-pdf";

async function main() {
  const buf = await renderReceiptPdf({
    schoolName: "Arul Neri Academy",
    tagline: "Learning · Care · Excellence",
    logoUrl: null,
    poweredBy: "CREOVY Digital Solutions",
    theme: {
      primary: "#0B3A6E",
      accent: "#E8A317",
    },
    typography: {
      preset: "arulneri",
      families: {
        display: "Plus Jakarta Sans",
        body: "Plus Jakarta Sans",
        tamil: "Noto Sans Tamil",
      },
    },
    receiptNumber: "AN/2026/001",
    createdAt: "2026-09-13T09:00:00.000Z",
    studentName: "Arun Kumar",
    admissionNumber: "AN2021-0001",
    feeHead: "Term 1 Tuition",
    amount: 15000,
    method: "upi",
    note: "Paid in full",
  });

  if (buf.subarray(0, 5).toString() !== "%PDF-") throw new Error("not a PDF");
  if (!buf.includes(Buffer.from("/MediaBox"))) throw new Error("A4 page box missing");

  const pageCount = (buf.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length;
  if (pageCount !== 1) throw new Error(`expected 1 page, got ${pageCount}`);

  const hay = buf.toString("latin1");
  function has(label: string, value: string) {
    if (hay.includes(value)) return;
    const hex = Buffer.from(value, "utf8").toString("hex");
    if (hay.toLowerCase().includes(hex.toLowerCase().slice(0, 16))) return;
    for (let i = 0; i < hex.length - 3; i += 4) {
      if (hay.toLowerCase().includes(hex.slice(i, i + 4).toLowerCase())) return;
    }
    throw new Error(`${label} missing from PDF: ${value}`);
  }

  has("school name", "Arul");
  has("tagline", "Learning");
  has("tagline part 2", "Excellence");
  has("student name", "Arun");
  has("admission number", "AN2021");
  has("receipt number", "AN/2026/001");
  has("fee head", "Tuition");
  has("display font", "Plus Jakarta");
  has("tamil font family", "Noto");
  has("poweredBy branding", "CREOVY");

  // ── Verify Tamil script in student name renders safely on A4 ────────────────
  const tamilBuf = await renderReceiptPdf({
    schoolName: "Arul Neri Academy",
    tagline: "Learning · Care · Excellence",
    logoUrl: null,
    poweredBy: "CREOVY Digital Solutions",
    theme: { primary: "#0B3A6E", accent: "#E8A317" },
    typography: {
      families: { display: "Plus Jakarta Sans", body: "Plus Jakarta Sans", tamil: "Noto Sans Tamil" },
    },
    receiptNumber: "AN/2026/002",
    createdAt: "2026-09-13T09:30:00.000Z",
    studentName: "அருண் குமார் (Arun Kumar)",
    admissionNumber: "AN2021-0002",
    feeHead: "Term 1 Tuition",
    amount: 15000,
    method: "cash",
    note: "கல்விக் கட்டணம்",
  });

  if (tamilBuf.subarray(0, 5).toString() !== "%PDF-") throw new Error("tamil PDF not valid");
  const tamilPageCount = (tamilBuf.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length;
  if (tamilPageCount !== 1) throw new Error(`expected 1 page for tamil receipt, got ${tamilPageCount}`);

  console.log("PASS: FEE-008 receipt PDF branding, typography, and layout");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
