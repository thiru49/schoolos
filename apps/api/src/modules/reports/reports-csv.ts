export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatFeeCollectionCsv(data: {
  rows: Array<{
    admissionNumber: string;
    studentName: string;
    className: string;
    sectionName: string;
    totalExpected: number;
    totalPaid: number;
    balanceDue: number;
    status: string;
  }>;
}): string {
  const header = "admission_number,student_name,class,section,total_expected,total_paid,balance_due,status";
  const lines = data.rows.map((r) =>
    [
      csvCell(r.admissionNumber),
      csvCell(r.studentName),
      csvCell(r.className),
      csvCell(r.sectionName),
      r.totalExpected,
      r.totalPaid,
      r.balanceDue,
      csvCell(r.status),
    ].join(","),
  );
  return `${header}\n${lines.join("\n")}\n`;
}

export function formatPaymentsCsv(data: {
  transactions: Array<{
    receiptNumber: string;
    date: string;
    admissionNumber: string;
    studentName: string;
    className: string;
    sectionName: string;
    feeHeadName: string;
    amount: number;
    method: string;
    note: string | null;
  }>;
}): string {
  const header = "receipt_number,date,admission_number,student_name,class,section,fee_head,amount,method,note";
  const lines = data.transactions.map((t) =>
    [
      csvCell(t.receiptNumber),
      csvCell(t.date),
      csvCell(t.admissionNumber),
      csvCell(t.studentName),
      csvCell(t.className),
      csvCell(t.sectionName),
      csvCell(t.feeHeadName),
      t.amount,
      csvCell(t.method),
      csvCell(t.note ?? ""),
    ].join(","),
  );
  return `${header}\n${lines.join("\n")}\n`;
}

export function formatStudentListCsv(data: {
  students: Array<{
    admissionNumber: string;
    fullName: string;
    className: string;
    sectionName: string;
    status: string;
    parentName: string | null;
    parentContact: string | null;
  }>;
}): string {
  const header = "admission_number,student_name,class,section,status,parent_name,parent_contact";
  const lines = data.students.map((s) =>
    [
      csvCell(s.admissionNumber),
      csvCell(s.fullName),
      csvCell(s.className),
      csvCell(s.sectionName),
      csvCell(s.status),
      csvCell(s.parentName ?? ""),
      csvCell(s.parentContact ?? ""),
    ].join(","),
  );
  return `${header}\n${lines.join("\n")}\n`;
}

export function formatTeacherWorkloadCsv(data: {
  teachers: Array<{
    employeeId: string;
    fullName: string;
    assignedSections: string[];
    assignedSubjects: string[];
    weeklyPeriodsCount: number;
  }>;
}): string {
  const header = "employee_id,teacher_name,assigned_sections,assigned_subjects,weekly_periods";
  const lines = data.teachers.map((t) =>
    [
      csvCell(t.employeeId),
      csvCell(t.fullName),
      csvCell(t.assignedSections.join("; ")),
      csvCell(t.assignedSubjects.join("; ")),
      t.weeklyPeriodsCount,
    ].join(","),
  );
  return `${header}\n${lines.join("\n")}\n`;
}

export function formatProgressTabulationCsv(data: {
  subjects: string[];
  rows: Array<{
    admissionNumber: string;
    studentName: string;
    className: string;
    sectionName: string;
    scores: Record<string, number | null>;
    totalScore: number;
    maxScore: number;
    percentage: number;
  }>;
}): string {
  const headerSubjects = data.subjects.map((s) => csvCell(s)).join(",");
  const header = `admission_number,student_name,class,section${headerSubjects ? `,${headerSubjects}` : ""},total_score,max_score,percentage`;
  const lines = data.rows.map((r) => {
    const subjectCols = data.subjects.map((sub) => r.scores[sub] ?? "").join(",");
    const base = [
      csvCell(r.admissionNumber),
      csvCell(r.studentName),
      csvCell(r.className),
      csvCell(r.sectionName),
    ].join(",");
    return `${base}${subjectCols ? `,${subjectCols}` : ""},${r.totalScore},${r.maxScore},${r.percentage.toFixed(1)}%`;
  });
  return `${header}\n${lines.join("\n")}\n`;
}
