"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { ParentsBoard } from "../../../features/people/parents-board";

export default function ParentsPage() {
  return (
    <div>
      <AppHeader title="Parents" subtitle="Guardians linked to students. Login id is the contact value." />
      <ParentsBoard />
    </div>
  );
}
