import { formatReportCsv, formatRosterCsv, parseAttendanceExportQuery } from "./attendance-csv";

describe("attendance CSV export", () => {
  it("parses a single-date roster export", () => {
    expect(
      parseAttendanceExportQuery({
        sectionId: "11111111-1111-4111-8111-111111111111",
        date: "2026-09-13",
      }),
    ).toEqual({
      kind: "day",
      sectionId: "11111111-1111-4111-8111-111111111111",
      date: "2026-09-13",
    });
  });

  it("parses a date-range report export", () => {
    expect(
      parseAttendanceExportQuery({
        sectionId: "11111111-1111-4111-8111-111111111111",
        from: "2026-09-01",
        to: "2026-09-13",
      }),
    ).toEqual({
      kind: "range",
      sectionId: "11111111-1111-4111-8111-111111111111",
      from: "2026-09-01",
      to: "2026-09-13",
    });
  });

  it("quotes CSV cells that contain commas", () => {
    const csv = formatRosterCsv([
      { admissionNumber: "AN2021-0001", fullName: "Arun, K", status: "P" },
    ]);
    expect(csv).toBe("admission_number,full_name,status\nAN2021-0001,\"Arun, K\",P\n");
  });

  it("writes present/absent/late/holiday columns for a range report", () => {
    const csv = formatReportCsv([
      { admissionNumber: "AN2021-0001", fullName: "Arun", P: 2, A: 1, L: 0, H: 0 },
    ]);
    expect(csv).toBe("admission_number,full_name,present,absent,late,holiday\nAN2021-0001,Arun,2,1,0,0\n");
  });
});
