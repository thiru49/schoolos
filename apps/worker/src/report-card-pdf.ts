import PDFDocument from "pdfkit";

export type ReportCardPayload = {
  schoolName: string;
  logoUrl: string | null;
  typography?: { families?: { display?: string; body?: string; tamil?: string } } | null;
  studentName: string;
  classSection: string;
  academicYear: string;
  rows: { exam: string; subject: string; score: number; maxScore: number }[];
};

const TAMIL_RE = /[\u0B80-\u0BFF]/;

export async function renderReportCardPdf(payload: ReportCardPayload): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50, compress: false });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const display = payload.typography?.families?.display ?? "Helvetica";
  doc.font("Helvetica-Bold").fontSize(18).text(payload.schoolName, { align: "center" });
  if (payload.logoUrl) {
    try {
      const res = await fetch(payload.logoUrl);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        doc.image(buf, 50, 40, { width: 48, height: 48 });
      }
    } catch {
      // Logo is optional; branding text still prints.
    }
  }
  doc.moveDown();
  doc.font("Helvetica").fontSize(11);
  doc.text(`Student: ${payload.studentName}`);
  doc.text(`Class / Section: ${payload.classSection}`);
  doc.text(`Academic year: ${payload.academicYear}`);
  doc.moveDown();
  doc.font("Helvetica-Bold").text("Exam                  Subject               Score    Max");
  doc.font("Helvetica");
  if (payload.rows.length === 0) {
    doc.text("No published marks for this academic year.");
  } else {
    for (const row of payload.rows) {
      const line = `${row.exam}  ${row.subject}  ${row.score} / ${row.maxScore}`;
      if (TAMIL_RE.test(line) || TAMIL_RE.test(payload.studentName)) {
        doc.font("Helvetica");
      }
      doc.text(line);
    }
  }
  doc.fontSize(8).fillColor("#666").text(`Typography: ${display}`, 50, 780);
  doc.end();
  return done;
}
