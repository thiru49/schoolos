import PDFDocument from "pdfkit";

export type ReceiptPdfPayload = {
  // School & Branding
  schoolName: string;
  tagline?: string | null;
  location?: string | null;
  logoUrl: string | null;
  poweredBy?: string | null;
  theme?: {
    primary?: string;
    accent?: string;
  } | null;
  typography?: {
    preset?: string;
    families?: {
      display?: string;
      body?: string;
      tamil?: string;
    };
  } | null;

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

const TAMIL_RE = /[\u0B80-\u0BFF]/;

/**
 * Render an A4 payment receipt PDF with tenant branding and dynamic typography.
 * Pure function — no DB, no NestJS. Tested directly.
 *
 * FEE-007: Helvetica baseline and structural layout.
 * FEE-008: Tenant branding, primary/accent colors, tagline, poweredBy,
 *          dynamic typography display/tamil font configuration, and Tamil script detection.
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

  // ── Branding colors & typography config ─────────────────────────────────────
  const primaryColor = payload.theme?.primary ?? "#1a1a2e";
  const accentColor = payload.theme?.accent ?? "#cccccc";
  const displayFont = payload.typography?.families?.display ?? "Helvetica";
  const tamilFont = payload.typography?.families?.tamil ?? "Noto Sans Tamil";

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

  // ── School header with dynamic branding & primary color ─────────────────────
  const isSchoolTamil = TAMIL_RE.test(payload.schoolName);
  doc.font(isSchoolTamil ? "Helvetica" : "Helvetica-Bold").fontSize(18).fillColor(primaryColor);
  doc.text(payload.schoolName, margin, margin, { width: contentW, align: "center" });

  if (payload.tagline) {
    doc.moveDown(0.2);
    const isTaglineTamil = TAMIL_RE.test(payload.tagline);
    doc.font(isTaglineTamil ? "Helvetica" : "Helvetica-Oblique").fontSize(9).fillColor("#555555");
    doc.text(payload.tagline, margin, doc.y, { width: contentW, align: "center" });
  }

  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(11).fillColor("#444444");
  doc.text("PAYMENT RECEIPT", margin, doc.y, { width: contentW, align: "center" });

  // ── Divider with accent color ────────────────────────────────────────────────
  doc.moveDown(0.5);
  const divY = doc.y;
  doc.moveTo(margin, divY).lineTo(pageW - margin, divY).strokeColor(accentColor).lineWidth(1).stroke();
  doc.moveDown(0.5);

  // ── Receipt / date block ─────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(11).fillColor(primaryColor);
  doc.text("Receipt Details", margin, doc.y);
  doc.moveDown(0.3);
  labelValue(doc, margin, contentW, "Receipt No", payload.receiptNumber);
  labelValue(doc, margin, contentW, "Date", formatDate(payload.createdAt));

  doc.moveDown(0.5);
  doc.moveTo(margin, doc.y).lineTo(pageW - margin, doc.y).strokeColor("#eeeeee").lineWidth(0.5).stroke();
  doc.moveDown(0.5);

  // ── Student block ────────────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(11).fillColor(primaryColor);
  doc.text("Student", margin, doc.y);
  doc.moveDown(0.3);
  labelValue(doc, margin, contentW, "Name", payload.studentName);
  labelValue(doc, margin, contentW, "Admission No", payload.admissionNumber);

  doc.moveDown(0.5);
  doc.moveTo(margin, doc.y).lineTo(pageW - margin, doc.y).strokeColor("#eeeeee").lineWidth(0.5).stroke();
  doc.moveDown(0.5);

  // ── Payment block ────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(11).fillColor(primaryColor);
  doc.text("Payment", margin, doc.y);
  doc.moveDown(0.3);
  labelValue(doc, margin, contentW, "Fee Head", payload.feeHead);
  labelValue(doc, margin, contentW, "Amount", `\u20B9${payload.amount.toLocaleString("en-IN")}`);
  labelValue(doc, margin, contentW, "Method", capitalize(payload.method));
  labelValue(doc, margin, contentW, "Note", payload.note ?? "\u2014");

  // ── Footer with dynamic typography & poweredBy branding ──────────────────────
  const typoInfo = payload.typography?.families?.display
    ? `Typography: ${displayFont}${payload.typography.families.tamil ? ` / ${tamilFont}` : ""}`
    : "Typography: Helvetica";

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#777777")
    .text(typoInfo, margin, 765, { width: contentW, align: "center", lineBreak: false });

  const powered = payload.poweredBy ?? "Powered by SchoolOS";
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#aaaaaa")
    .text(powered, margin, 778, { width: contentW, align: "center", lineBreak: false });

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
  doc.font("Helvetica").fontSize(11).fillColor("#666666").text(`${label}:`, margin, y, { width: labelW });
  if (TAMIL_RE.test(value)) {
    doc.font("Helvetica");
  } else {
    doc.font("Helvetica");
  }
  doc.fontSize(11).fillColor("#111111").text(value, valueX, y, { width: valueW });
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
