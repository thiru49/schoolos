"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { AcademicYearsBoard } from "../../../features/academics/academic-years-board";

export default function AcademicYearsPage() {
  return (
    <div>
      <AppHeader
        title="Academic Years"
        subtitle="Create and activate academic years for your school."
      />
      <AcademicYearsBoard />
    </div>
  );
}
