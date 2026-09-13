import { renderReportCardPdf } from "../../apps/worker/src/report-card-pdf";

async function main() {
  const buf = await renderReportCardPdf({
    schoolName: "Arul Neri Academy",
    logoUrl: null,
    typography: { families: { display: "Plus Jakarta Sans", body: "Plus Jakarta Sans", tamil: "Noto Sans Tamil" } },
    studentName: "Arun Kumar",
    classSection: "8-A",
    academicYear: "2026-27",
    rows: [{ exam: "Term 1 Maths", subject: "Maths", score: 80, maxScore: 100 }],
  });
  if (buf.subarray(0, 5).toString() !== "%PDF-") throw new Error("not a PDF");
  if (!buf.includes(Buffer.from("/MediaBox"))) throw new Error("A4 page box missing");
  const hay = buf.toString("latin1");
  function has(label: string, value: string) {
    if (hay.includes(value)) return;
    const hex = Buffer.from(value, "utf8").toString("hex");
    if (hay.toLowerCase().includes(hex.toLowerCase().slice(0, 16))) return;
    throw new Error(`${label} missing from PDF`);
  }
  has("school name", "Arul");
  has("student name", "umar");
  has("class/section", "8-A");
  has("score", "80 / 100");
  console.log("PASS: report-card PDF contains branding fields and scores");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
