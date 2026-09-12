"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { HomeworkBoard } from "../../../features/homework/homework-board";

export default function HomeworkPage() {
  return (
    <div>
      <AppHeader title="Homework" subtitle="Assigned by section. Subject catalog is not in this module." />
      <HomeworkBoard />
    </div>
  );
}
