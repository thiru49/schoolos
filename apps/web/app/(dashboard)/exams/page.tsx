"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { ExamsBoard } from "../../../features/exams/exams-board";

export default function ExamsPage() {
  return (
    <div>
      <AppHeader title="Exams & Marks" subtitle="Draft → submit → publish. Parents see published scores only." />
      <ExamsBoard />
    </div>
  );
}
