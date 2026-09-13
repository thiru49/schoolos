import { describe, expect, it } from "vitest";
import { renderReceiptPdf, type ReceiptPdfPayload } from "./receipt-pdf";

const base: ReceiptPdfPayload = {
  schoolName: "Arul Neri Academy",
  logoUrl: null,
  typography: null,
  receiptNumber: "AN/42",
  createdAt: "2026-09-13T07:00:00.000Z",
  studentName: "Arun Kumar",
  admissionNumber: "AN2021-0001",
  feeHead: "Tuition Fee",
  amount: 3500,
  method: "upi",
  note: null,
};

/**
 * PDFKit encodes text as hex TJ operands and inserts kerning numbers between
 * hex segments, so a string like "Arun" may appear as <4172> -15 <756e>.
 * This helper checks that every 2-byte chunk of the string's hex encoding
 * appears somewhere in the PDF's latin1 representation.
 */
function pdfContainsAll(buf: Buffer, text: string): boolean {
  const latin = buf.toString("latin1").toLowerCase();
  if (latin.includes(text.toLowerCase())) return true;
  const hex = Buffer.from(text, "utf8").toString("hex").toLowerCase();
  // Check 4-char hex chunks (2 bytes each) — tolerates any PDFKit kerning split
  for (let i = 0; i < hex.length - 3; i += 4) {
    const chunk = hex.slice(i, i + 4);
    if (!latin.includes(chunk)) return false;
  }
  return true;
}

describe("renderReceiptPdf", () => {
  it("returns a valid PDF (starts with %PDF-)", async () => {
    const buf = await renderReceiptPdf(base);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("contains A4 MediaBox [0 0 595.28 841.89]", async () => {
    const buf = await renderReceiptPdf(base);
    expect(buf.includes(Buffer.from("/MediaBox"))).toBe(true);
    // Confirm A4 dimensions appear in the MediaBox
    expect(buf.toString("latin1")).toContain("595.28");
    expect(buf.toString("latin1")).toContain("841.89");
  });

  it("contains the school name", async () => {
    const buf = await renderReceiptPdf(base);
    // "Arul" → 4172756c — check each 2-byte chunk
    expect(pdfContainsAll(buf, "Arul")).toBe(true);
  });

  it("contains the receipt number", async () => {
    const buf = await renderReceiptPdf(base);
    // "AN/42" → 414e2f3432 — no kerning expected on short string
    expect(pdfContainsAll(buf, "AN/42")).toBe(true);
  });

  it("contains the student name", async () => {
    const buf = await renderReceiptPdf(base);
    // "Arun" hex chunks: 4172 + 756e — check each independently
    const latin = buf.toString("latin1").toLowerCase();
    expect(latin.includes("4172")).toBe(true); // "Ar"
    expect(latin.includes("756e")).toBe(true); // "un"
  });

  it("contains the fee head name", async () => {
    const buf = await renderReceiptPdf(base);
    // "Tuition" — "T" may be split from "uition"
    const latin = buf.toString("latin1").toLowerCase();
    // "uition" → 756974696f6e
    expect(latin.includes("756974")).toBe(true);
  });

  it("contains the admission number", async () => {
    const buf = await renderReceiptPdf(base);
    // "AN2021" → 414e323032 31
    expect(pdfContainsAll(buf, "AN2021")).toBe(true);
  });

  it("renders em-dash when note is null", async () => {
    const buf = await renderReceiptPdf({ ...base, note: null });
    // U+2014 EM DASH → WinAnsiEncoding byte 0x97.
    // PDFKit encodes it as the hex TJ operand <97> (literal ASCII "97" in the stream).
    // Check that the Note: field is present (label) and that <97> appears (the em-dash value).
    const latin = buf.toString("latin1");
    // "Note:" label → 4e6f74653a
    expect(latin.toLowerCase().includes("4e6f74")).toBe(true); // "Not"
    // em-dash as PDFKit hex operand — the two chars '9' and '7' appear adjacent in a <...> block
    // In the uncompressed stream: [<97> 0] TJ
    expect(latin.includes("<97>") || latin.includes("[<97>")).toBe(true);
  });

  it("renders note text when provided", async () => {
    const buf = await renderReceiptPdf({ ...base, note: "Scholarship" });
    // "Scholarship" → 5363686f6c617273686970
    // "chol" → 63686f6c  (middle chunk, kerning unlikely)
    const latin = buf.toString("latin1").toLowerCase();
    expect(latin.includes("6368")).toBe(true); // "ch"
    expect(latin.includes("6f6c")).toBe(true); // "ol"
  });

  // ── FEE-008 Branding & Typography Tests ────────────────────────────────────

  it("renders configured display and tamil typography settings", async () => {
    const buf = await renderReceiptPdf({
      ...base,
      typography: {
        preset: "arulneri",
        families: {
          display: "Plus Jakarta Sans",
          body: "Plus Jakarta Sans",
          tamil: "Noto Sans Tamil",
        },
      },
    });
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect((buf.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length).toBe(1);
    expect(pdfContainsAll(buf, "Plus Jakarta")).toBe(true);
    expect(pdfContainsAll(buf, "Noto")).toBe(true);
    expect(pdfContainsAll(buf, "amil")).toBe(true);
  });

  it("renders tenant tagline when provided", async () => {
    const buf = await renderReceiptPdf({
      ...base,
      tagline: "Learning · Care · Excellence",
    });
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdfContainsAll(buf, "Learning")).toBe(true);
    expect(pdfContainsAll(buf, "Excellence")).toBe(true);
  });

  it("renders custom poweredBy branding in footer", async () => {
    const buf = await renderReceiptPdf({
      ...base,
      poweredBy: "CREOVY Digital Solutions",
    });
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdfContainsAll(buf, "CREOVY")).toBe(true);
    expect(pdfContainsAll(buf, "Solutions")).toBe(true);
  });

  it("renders fallback typography and default poweredBy when not configured", async () => {
    const buf = await renderReceiptPdf({
      ...base,
      typography: null,
      poweredBy: null,
    });
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdfContainsAll(buf, "Helvetica")).toBe(true);
    expect(pdfContainsAll(buf, "SchoolOS")).toBe(true);
  });

  it("renders safely when student name contains Tamil script", async () => {
    const buf = await renderReceiptPdf({
      ...base,
      studentName: "அருண் குமார் (Arun Kumar)",
      typography: {
        families: {
          display: "Plus Jakarta Sans",
          body: "Plus Jakarta Sans",
          tamil: "Noto Sans Tamil",
        },
      },
    });
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.includes(Buffer.from("/MediaBox"))).toBe(true);
    expect(pdfContainsAll(buf, "Arun Kumar")).toBe(true);
  });

  it("renders safely when note contains Tamil script", async () => {
    const buf = await renderReceiptPdf({
      ...base,
      note: "முதல் தவணை கட்டணம் (First installment)",
    });
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.includes(Buffer.from("/MediaBox"))).toBe(true);
    expect(pdfContainsAll(buf, "installment")).toBe(true);
  });
});
