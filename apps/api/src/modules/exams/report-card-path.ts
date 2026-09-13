import path from "node:path";
import os from "node:os";

export function reportCardPdfDir() {
  return process.env.PDF_DIR ?? path.join(os.tmpdir(), "schoolos-pdfs");
}

export function reportCardPdfPath(schoolId: string, studentId: string) {
  return path.join(reportCardPdfDir(), `${schoolId}-${studentId}.pdf`);
}
