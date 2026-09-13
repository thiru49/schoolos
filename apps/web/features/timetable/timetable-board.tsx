"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  GraduationCap,
  Plus,
  Printer,
  Sparkles,
  Users,
} from "lucide-react";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import { Skeleton } from "../../components/ui/skeleton";
import { TimetableGrid } from "./timetable-grid";
import { TimetablePeriodDialog } from "./timetable-period-dialog";
import { TimetablePrint } from "./timetable-print";
import {
  DEFAULT_BELL_SLOTS,
  type BellSlot,
  type Period,
  type Section,
  type Subject,
  type Teacher,
} from "./timetable-types";

export function TimetableBoard() {
  const { branding, acl } = useAppBranding();
  const canWrite = acl.permissions.includes(PERMISSIONS.TIMETABLE_WRITE);

  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Page state
  const [state, setState] = useState<
    "loading" | "loaded" | "empty" | "error" | "denied" | "offline"
  >("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogInitialData, setDialogInitialData] = useState<Partial<Period> | null>(null);
  const [isEditingPeriod, setIsEditingPeriod] = useState(false);

  // Load section periods
  const loadPeriods = useCallback(async () => {
    if (!sectionId) return;
    setState("loading");
    setErrorMessage("");
    try {
      const list = await api().timetable.list({ sectionId });
      setPeriods(list as Period[]);
      setState(list.length === 0 ? "empty" : "loaded");
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setState("denied");
        setErrorMessage(e.message);
        return;
      }
      if (e instanceof TypeError) {
        setState("offline");
        setErrorMessage("You appear to be offline. Please check your internet connection.");
        return;
      }
      setState("error");
      setErrorMessage(e instanceof Error ? e.message : "Failed to load timetable");
    }
  }, [sectionId]);

  // Initial load: sections, subjects, teachers
  useEffect(() => {
    api()
      .academics.sections()
      .then((list) => {
        setSections(list);
        if (list[0]) setSectionId(list[0].id);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 403) {
          setState("denied");
          setErrorMessage(e.message);
        }
      });

    api()
      .subjects.list()
      .then((list) => setSubjects(list))
      .catch(() => undefined);

    api()
      .teachers.list()
      .then((list) => setTeachers(list))
      .catch(() => undefined);
  }, []);

  // Reload periods whenever sectionId changes
  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  const activeSection = useMemo(
    () => sections.find((s) => s.id === sectionId),
    [sections, sectionId],
  );

  // Metrics
  const draftCount = useMemo(() => periods.filter((p) => !p.published).length, [periods]);
  const totalPeriods = periods.length;
  const weeklyMinutes = useMemo(() => {
    return periods.reduce((acc, p) => {
      const [startH, startM] = p.startTime.split(":").map(Number);
      const [endH, endM] = p.endTime.split(":").map(Number);
      const diff = (endH * 60 + endM) - (startH * 60 + startM);
      return acc + (diff > 0 ? diff : 45);
    }, 0);
  }, [periods]);
  const weeklyHours = (weeklyMinutes / 60).toFixed(1);

  // Derive academic year from existing branding source (receiptPrefix format e.g. ANA/26-27 -> 2026-27)
  const academicYear = useMemo(() => {
    if (branding.receiptPrefix && branding.receiptPrefix.includes("/")) {
      const segment = branding.receiptPrefix.split("/")[1]?.trim();
      if (segment) {
        return /^\d{2}-\d{2}$/.test(segment) ? `20${segment}` : segment;
      }
    }
    return "2026-27";
  }, [branding.receiptPrefix]);

  // Consolidated Bell Slots for Print & Matrix
  const slots: BellSlot[] = useMemo(() => {
    const slotMap = new Map<string, BellSlot>();
    for (const d of DEFAULT_BELL_SLOTS) {
      slotMap.set(d.startTime, d);
    }
    for (const p of periods) {
      if (!slotMap.has(p.startTime)) {
        slotMap.set(p.startTime, {
          slotNumber: 99,
          label: `Slot ${p.startTime}`,
          startTime: p.startTime,
          endTime: p.endTime,
        });
      }
    }
    return Array.from(slotMap.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [periods]);

  // Actions
  const handlePublishSection = async () => {
    if (!sectionId) return;
    setIsPublishing(true);
    try {
      const res = await api().timetable.publish(sectionId);
      toast.success(
        res.published > 0
          ? `Successfully published ${res.published} periods for Section ${activeSection?.label ?? ""}`
          : "All periods in this section are now published.",
      );
      await loadPeriods();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to publish timetable");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSavePeriod = async (data: {
    subjectId: string;
    teacherId: string;
    weekday: number;
    startTime: string;
    endTime: string;
  }) => {
    if (!activeSection) throw new Error("No section selected");

    if (isEditingPeriod && dialogInitialData?.id) {
      await api().timetable.update(dialogInitialData.id, data);
      toast.success("Period updated (saved as draft until published)");
    } else {
      await api().timetable.create({
        classId: activeSection.classId,
        sectionId: activeSection.id,
        ...data,
      });
      toast.success("New period scheduled (saved as draft until published)");
    }
    await loadPeriods();
  };

  const handleDeletePeriod = async (id: string) => {
    try {
      await api().timetable.remove(id);
      toast.success("Period removed from timetable");
      await loadPeriods();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete period");
    }
  };

  const handleCreateSubject = async (name: string) => {
    const s = await api().subjects.create(name);
    setSubjects((prev) => [...prev, s]);
    return s;
  };

  const openAddDialogForSlot = (weekday: number, startTime: string, endTime: string) => {
    setIsEditingPeriod(false);
    setDialogInitialData({ weekday, startTime, endTime });
    setIsDialogOpen(true);
  };

  const openEditDialog = (period: Period) => {
    setIsEditingPeriod(true);
    setDialogInitialData(period);
    setIsDialogOpen(true);
  };

  if (state === "denied") {
    return <PermissionDenied detail={errorMessage || "You do not have permission to view timetables."} />;
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Section Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Class Section:
            </span>
            <select
              aria-label="Class Section"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 shadow-2xs transition hover:border-slate-300 focus:border-primary focus:outline-none"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={sections.length === 0}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Section Status Badge */}
          {activeSection && state !== "loading" ? (
            draftCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 shadow-2xs">
                <AlertCircle size={13} className="text-amber-600" />
                {draftCount} Draft {draftCount === 1 ? "Change" : "Changes"}
              </span>
            ) : totalPeriods > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-2xs">
                <CheckCircle2 size={13} className="text-emerald-600" />
                All Published
              </span>
            ) : null
          ) : null}
        </div>

        {/* Global Timetable Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Print Timetable Action */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            disabled={periods.length === 0}
            className="flex items-center gap-1.5"
          >
            <Printer size={14} />
            Print Timetable
          </Button>

          {/* Publish Action (for admins) */}
          {canWrite ? (
            <Button
              size="sm"
              variant={draftCount > 0 ? "primary" : "secondary"}
              onClick={handlePublishSection}
              disabled={isPublishing || draftCount === 0}
              className="flex items-center gap-1.5 font-semibold"
            >
              <Sparkles size={14} />
              {isPublishing
                ? "Publishing..."
                : draftCount > 0
                ? `Publish Section (${draftCount})`
                : "Timetable Published"}
            </Button>
          ) : null}

          {/* Add Period Button (for admins) */}
          {canWrite ? (
            <Button
              size="sm"
              onClick={() => {
                setIsEditingPeriod(false);
                setDialogInitialData(null);
                setIsDialogOpen(true);
              }}
              className="flex items-center gap-1.5"
            >
              <Plus size={14} />
              Add Period
            </Button>
          ) : null}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="flex items-center gap-3 p-4">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="font-display text-xl font-bold text-slate-900">
              {state === "loading" ? "..." : totalPeriods}
            </div>
            <div className="text-xs font-medium text-slate-500">Scheduled Periods</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-4">
          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600">
            <Clock size={20} />
          </div>
          <div>
            <div className="font-display text-xl font-bold text-slate-900">
              {state === "loading" ? "..." : `${weeklyHours}h`}
            </div>
            <div className="text-xs font-medium text-slate-500">Hours / Week</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-4">
          <div className="rounded-xl bg-sky-500/10 p-2.5 text-sky-600">
            <GraduationCap size={20} />
          </div>
          <div>
            <div className="font-display text-xl font-bold text-slate-900">
              {subjects.length}
            </div>
            <div className="text-xs font-medium text-slate-500">Active Subjects</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-4">
          <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600">
            <Users size={20} />
          </div>
          <div>
            <div className="font-display text-xl font-bold text-slate-900">
              {teachers.length}
            </div>
            <div className="text-xs font-medium text-slate-500">Teachers Assigned</div>
          </div>
        </Card>
      </div>

      {/* Draft Warning Banner */}
      {draftCount > 0 && canWrite && state !== "loading" ? (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 shadow-xs sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <h3 className="font-display text-sm font-bold text-amber-950">
                You have {draftCount} unpublished {draftCount === 1 ? "change" : "changes"} in Section {activeSection?.label}
              </h3>
              <p className="text-xs text-amber-800/90">
                Draft periods are only visible to academic staff. Students and parents will not see these changes until published.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handlePublishSection}
            disabled={isPublishing}
            className="shrink-0 bg-amber-800 text-white hover:bg-amber-900"
          >
            {isPublishing ? "Publishing..." : `Publish ${draftCount} Changes Now`}
          </Button>
        </div>
      ) : null}

      {/* State Renderings */}
      {state === "loading" ? (
        /* Structural Weekly Grid Skeleton */
        <div className="space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-8 w-36 rounded-lg" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-7 gap-3">
              {Array.from({ length: 28 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {state === "offline" ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <ErrorState
            message="You appear to be offline. Please check your network connection and try again."
            onRetry={() => void loadPeriods()}
          />
        </div>
      ) : null}

      {state === "error" ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <ErrorState message={errorMessage} onRetry={() => void loadPeriods()} />
        </div>
      ) : null}

      {state === "empty" && sections.length === 0 ? (
        <EmptyState
          title="No Classes or Sections Found"
          detail="Configure classes and sections in Academics before creating a timetable schedule."
        />
      ) : null}

      {state === "empty" && sections.length > 0 && subjects.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <EmptyState
            title="No Subjects Configured"
            detail="You need to add at least one subject to begin scheduling timetable periods."
          />
          {canWrite ? (
            <Button
              className="mt-4"
              onClick={() => {
                setIsEditingPeriod(false);
                setDialogInitialData(null);
                setIsDialogOpen(true);
              }}
            >
              <Plus size={16} className="mr-1.5" />
              Add Subject & Period
            </Button>
          ) : null}
        </div>
      ) : null}

      {state === "empty" && sections.length > 0 && subjects.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <EmptyState
            title="No Periods Scheduled"
            detail={`There are no timetable periods scheduled for Section ${activeSection?.label ?? ""}.`}
          />
          {canWrite ? (
            <Button
              className="mt-4"
              onClick={() => {
                setIsEditingPeriod(false);
                setDialogInitialData(null);
                setIsDialogOpen(true);
              }}
            >
              <Plus size={16} className="mr-1.5" />
              Schedule First Period
            </Button>
          ) : null}
        </div>
      ) : null}

      {state === "loaded" ? (
        <TimetableGrid
          periods={periods}
          canWrite={canWrite}
          onEditPeriod={openEditDialog}
          onDeletePeriod={handleDeletePeriod}
          onAddPeriodSlot={openAddDialogForSlot}
        />
      ) : null}

      {/* Period Create / Edit Dialog */}
      <TimetablePeriodDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSavePeriod}
        initialData={dialogInitialData}
        subjects={subjects}
        teachers={teachers}
        onCreateSubject={canWrite ? handleCreateSubject : undefined}
        allPeriods={periods}
        isEditing={isEditingPeriod}
        onDelete={
          isEditingPeriod && dialogInitialData?.id
            ? () => handleDeletePeriod(dialogInitialData.id!)
            : undefined
        }
      />

      {/* Hidden Printable Document for window.print() */}
      {activeSection ? (
        <TimetablePrint
          schoolName={branding.schoolName}
          location={branding.location}
          logoUrl={branding.logoUrl}
          academicYear={academicYear}
          section={activeSection}
          periods={periods}
          slots={slots}
        />
      ) : null}
    </div>
  );
}
