"use client";

import { useParams } from "next/navigation";
import { AppHeader } from "../../../../components/shell/app-header";
import { MarksEntry } from "../../../../features/exams/marks-entry";

export default function ExamMarksPage() {
  const params = useParams<{ id: string }>();
  return (
    <div>
      <AppHeader title="Marks entry" subtitle="Save draft, then submit. Academic admin publishes." />
      <MarksEntry examId={params.id} />
    </div>
  );
}
