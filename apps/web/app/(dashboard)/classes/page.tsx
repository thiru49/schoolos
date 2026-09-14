"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { ClassesSectionsBoard } from "../../../features/academics/classes-sections-board";

export default function ClassesPage() {
  return (
    <div>
      <AppHeader
        title="Classes & Sections"
        subtitle="Manage class structure and sections for each academic year."
      />
      <ClassesSectionsBoard />
    </div>
  );
}
