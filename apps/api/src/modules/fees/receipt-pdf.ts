import PDFDocument from "pdfkit";

export type ReceiptPdfPayload = {
  // School
  schoolName: string;
  logoUrl: string | null;
  /** Accepted now; used by FEE-008 for full typography wiring. */
  typography?: { families?: { display?: string; body?: string; tamil?: string } } | null;

  // Receipt
  receiptNumber: string;
  createdAt: string; // ISO-8601

  // Student
  studentName: string;
  admissionNumber: string;

  // Payment
  feeHead: string;
  amount: number; // integer stored in DB (rupees)
  method: string;
  note: string | null;
};

/**
 * Render an A4 payment receipt PDF.
 * Pure function — no DB, no NestJS. Tested directly.
 *
 * FEE-007: Helvetica baseline (built-in PDFKit, no font download).
 * FEE-008: will pass typography.families to swap in tenant fonts.
 */
export async function renderReceiptPdf(payload: ReceiptPdfPayload): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50, compress: false });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageW = doc.page.width; // 595.28 pt
  const margin = 50;
  const contentW = pageW - margin * 2;

  // ── Logo (optional) ──────────────────────────────────────────────────────────
  if (payload.logoUrl) {
    try {
      const res = await fetch(payload.logoUrl);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        doc.image(buf, margin, margin, { width: 48, height: 48 });
      }
    } catch {
      // Logo is optional; text still prints.
    }
  }

  // ── School header ────────────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#1a1a2e");
  doc.text(payload.schoolName, margin, margin, { width: contentW, align: "center" });

  doc.font("Helvetica").fontSize(11).fillColor("#444");
  doc.text("PAYMENT RECEIPT", margin, doc.y, { width: contentW, align: "center" });

  // ── Divider ──────────────────────────────────────────────────────────────────
  doc.moveDown(0.5);
  const divY = doc.y;
  doc.moveTo(margin, divY).lineTo(pageW - margin, divY).strokeColor("#cccccc").lineWidth(1).stroke();
  doc.moveDown(0.5);

  // ── Receipt / date block ─────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#222");
  doc.text("Receipt Details", margin, doc.y);
  doc.moveDown(0.3);
  labelValue(doc, margin, contentW, "Receipt No", payload.receiptNumber);
  labelValue(doc, margin, contentW, "Date", formatDate(payload.createdAt));

  doc.moveDown(0.5);
  doc.moveTo(margin, doc.y).lineTo(pageW - margin, doc.y).strokeColor("#eeeeee").lineWidth(0.5).stroke();
  doc.moveDown(0.5);

  // ── Student block ────────────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#222");
  doc.text("Student", margin, doc.y);
  doc.moveDown(0.3);
  labelValue(doc, margin, contentW, "Name", payload.studentName);
  labelValue(doc, margin, contentW, "Admission No", payload.admissionNumber);

  doc.moveDown(0.5);
  doc.moveTo(margin, doc.y).lineTo(pageW - margin, doc.y).strokeColor("#eeeeee").lineWidth(0.5).stroke();
  doc.moveDown(0.5);

  // ── Payment block ────────────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#222");
  doc.text("Payment", margin, doc.y);
  doc.moveDown(0.3);
  labelValue(doc, margin, contentW, "Fee Head", payload.feeHead);
  labelValue(doc, margin, contentW, "Amount", `\u20B9${payload.amount.toLocaleString("en-IN")}`);
  labelValue(doc, margin, contentW, "Method", capitalize(payload.method));
  labelValue(doc, margin, contentW, "Note", payload.note ?? "\u2014");

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footerY = doc.page.height - 40;
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#aaaaaa")
    .text("Powered by SchoolOS", margin, footerY, { width: contentW, align: "center" });

  doc.end();
  return done;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function labelValue(
  doc: PDFKit.PDFDocument,
  margin: number,
  contentW: number,
  label: string,
  value: string,
): void {
  const labelW = 130;
  const valueX = margin + labelW;
  const valueW = contentW - labelW;
  const y = doc.y;
  doc.font("Helvetica").fontSize(11).fillColor("#666").text(`${label}:`, margin, y, { width: labelW });
  doc.font("Helvetica").fontSize(11).fillColor("#111").text(value, valueX, y, { width: valueW });
  doc.moveDown(0.25);
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return iso;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
