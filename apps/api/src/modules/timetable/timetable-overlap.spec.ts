import { periodsOverlap } from "./timetable-overlap";

describe("periodsOverlap", () => {
  it("detects overlapping periods on the same day", () => {
    expect(periodsOverlap("09:00", "09:45", "09:30", "10:15")).toBe(true);
  });

  it("allows adjacent periods", () => {
    expect(periodsOverlap("09:00", "09:45", "09:45", "10:30")).toBe(false);
  });
});
