"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { todayIso } from "../../lib/utils";
import { Card, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/states/empty-state";

export function DashboardView() {
  const [loading, setLoading] = useState(true);
  const [presentPct, setPresentPct] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [sectionLabel, setSectionLabel] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const sections = await api().academics.sections();
        const first = sections[0];
        if (!first) {
          setLoading(false);
          return;
        }
        setSectionLabel(first.label);
        const data = await api().attendanceApi.list({ sectionId: first.id, date: todayIso() });
        setStudentCount(data.records.length);
        const marked = data.records.filter((r) => r.status);
        const present = data.records.filter((r) => r.status === "P").length;
        setPresentPct(marked.length ? Math.round((present / data.records.length) * 100) : null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardTitle>Students in {sectionLabel || "scope"}</CardTitle>
          <p className="mt-2 font-display text-3xl text-primary">{studentCount}</p>
        </Card>
        <Card>
          <CardTitle>Present today</CardTitle>
          <p className="mt-2 font-display text-3xl text-success">{presentPct == null ? "—" : `${presentPct}%`}</p>
        </Card>
        <Card>
          <CardTitle>Fees collected</CardTitle>
          <p className="mt-2 text-sm text-slate-500">Not in this slice</p>
        </Card>
        <Card>
          <CardTitle>Fees pending</CardTitle>
          <p className="mt-2 text-sm text-slate-500">Not in this slice</p>
        </Card>
      </div>
      <div className="mt-6">
        <EmptyState title="No notices yet" detail="Notices are not part of the attendance vertical slice." />
      </div>
    </div>
  );
}
