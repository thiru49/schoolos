export type Section = {
  id: string;
  classId: string;
  label: string;
};

export type Period = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  published: boolean;
  sectionId: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  label?: string;
};

export type Subject = {
  id: string;
  name: string;
};

export type Teacher = {
  id: string;
  fullName: string;
  employeeId: string;
};

export type BellSlot = {
  slotNumber: number;
  label: string;
  startTime: string;
  endTime: string;
};

export const DEFAULT_BELL_SLOTS: BellSlot[] = [
  { slotNumber: 1, label: "Period 1", startTime: "09:00", endTime: "09:45" },
  { slotNumber: 2, label: "Period 2", startTime: "09:45", endTime: "10:30" },
  { slotNumber: 3, label: "Period 3", startTime: "10:45", endTime: "11:30" },
  { slotNumber: 4, label: "Period 4", startTime: "11:30", endTime: "12:15" },
  { slotNumber: 5, label: "Period 5", startTime: "13:00", endTime: "13:45" },
  { slotNumber: 6, label: "Period 6", startTime: "13:45", endTime: "14:30" },
  { slotNumber: 7, label: "Period 7", startTime: "14:30", endTime: "15:15" },
  { slotNumber: 8, label: "Period 8", startTime: "15:15", endTime: "16:00" },
];

export const DAYS = [
  { weekday: 1, name: "Monday", short: "Mon" },
  { weekday: 2, name: "Tuesday", short: "Tue" },
  { weekday: 3, name: "Wednesday", short: "Wed" },
  { weekday: 4, name: "Thursday", short: "Thu" },
  { weekday: 5, name: "Friday", short: "Fri" },
  { weekday: 6, name: "Saturday", short: "Sat" },
  { weekday: 7, name: "Sunday", short: "Sun" },
];

export function periodsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}
