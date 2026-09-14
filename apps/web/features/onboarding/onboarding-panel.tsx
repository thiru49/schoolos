"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { ErrorState } from "../../components/states/error-state";
import { EmptyState } from "../../components/states/empty-state";
import {
  buildSetupJourney,
  canSeeSetupGuidance,
  evaluateSetupSnapshot,
  getVisibleSetupSteps,
  type EvaluatedSetupJourney,
  type SetupLoadState,
  type SetupStepId,
} from "./onboarding-policy";

type PanelState = "loading" | "loaded" | "error" | "empty" | "hidden";

export function OnboardingPanel() {
  const { acl } = useAppBranding();
  const visibleSteps = useMemo(() => getVisibleSetupSteps(acl), [acl]);
  const allowed = useMemo(() => canSeeSetupGuidance(acl), [acl]);

  const [panelState, setPanelState] = useState<PanelState>(allowed ? "loading" : "hidden");
  const [loadState, setLoadState] = useState<SetupLoadState>("empty");
  const [journey, setJourney] = useState<EvaluatedSetupJourney | null>(null);
  const [failedFields, setFailedFields] = useState<SetupStepId[]>([]);
  const [errorMessage, setErrorMessage] = useState("Failed to load school setup status");

  const fetchSetup = useCallback(async () => {
    if (!allowed) {
      setPanelState("hidden");
      return;
    }
    if (visibleSteps.length === 0) {
      setPanelState("empty");
      setJourney({ steps: [], completedCount: 0, readyForOperations: false });
      return;
    }

    setPanelState("loading");
    setErrorMessage("Failed to load school setup status");

    const requests: {
      years?: Promise<unknown[]>;
      classes?: Promise<unknown[]>;
      sections?: Promise<unknown[]>;
      subjects?: Promise<unknown[]>;
      teachers?: Promise<unknown[]>;
      students?: Promise<unknown[]>;
      branding?: Promise<{ schoolName?: string | null }>;
    } = {};

    if (visibleSteps.includes("academic_year")) {
      requests.years = api().academics.years.list();
    }
    if (visibleSteps.includes("classes")) {
      requests.classes = api().academics.classes.list();
    }
    if (visibleSteps.includes("sections")) {
      requests.sections = api().academics.sections();
    }
    if (visibleSteps.includes("subjects")) {
      requests.subjects = api().academics.subjects.list();
    }
    if (visibleSteps.includes("teachers")) {
      requests.teachers = api().teachers.list();
    }
    if (visibleSteps.includes("students")) {
      requests.students = api().students.list();
    }
    if (visibleSteps.includes("branding")) {
      requests.branding = api().branding.getSettings();
    }

    const settled = await Promise.allSettled([
      requests.years ?? Promise.resolve([]),
      requests.classes ?? Promise.resolve([]),
      requests.sections ?? Promise.resolve([]),
      requests.subjects ?? Promise.resolve([]),
      requests.teachers ?? Promise.resolve([]),
      requests.students ?? Promise.resolve([]),
      requests.branding ?? Promise.resolve({ schoolName: "" }),
    ]);

    const evaluated = evaluateSetupSnapshot({
      years: requests.years ? (settled[0] as PromiseSettledResult<unknown[]>) : undefined,
      classes: requests.classes ? (settled[1] as PromiseSettledResult<unknown[]>) : undefined,
      sections: requests.sections ? (settled[2] as PromiseSettledResult<unknown[]>) : undefined,
      subjects: requests.subjects ? (settled[3] as PromiseSettledResult<unknown[]>) : undefined,
      teachers: requests.teachers ? (settled[4] as PromiseSettledResult<unknown[]>) : undefined,
      students: requests.students ? (settled[5] as PromiseSettledResult<unknown[]>) : undefined,
      branding: requests.branding
        ? (settled[6] as PromiseSettledResult<{ schoolName?: string | null }>)
        : undefined,
    });

    if (evaluated.loadState === "failure") {
      const firstRejected = settled.find((item) => item.status === "rejected") as
        | PromiseRejectedResult
        | undefined;
      const reason = firstRejected?.reason;
      setErrorMessage(reason instanceof Error ? reason.message : "Failed to load school setup status");
      setPanelState("error");
      setJourney(null);
      setLoadState("failure");
      setFailedFields(evaluated.failedFields);
      return;
    }

    setLoadState(evaluated.loadState);
    setFailedFields(evaluated.failedFields);
    setJourney(buildSetupJourney(acl, evaluated.snapshot));
    setPanelState("loaded");
  }, [acl, allowed, visibleSteps]);

  useEffect(() => {
    void fetchSetup();
  }, [fetchSetup]);

  if (panelState === "hidden") return null;

  if (panelState === "loading") {
    return (
      <Card className="border-slate-200">
        <Skeleton className="h-6 w-56" />
        <p className="mt-2 text-xs text-slate-500">Loading school setup status…</p>
        <div className="mt-4 space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </Card>
    );
  }

  if (panelState === "error") {
    return (
      <ErrorState message={errorMessage} onRetry={() => void fetchSetup()} />
    );
  }

  if (panelState === "empty" || !journey || journey.steps.length === 0) {
    return (
      <EmptyState
        title="No setup actions available"
        detail="Your account does not have permission to complete school first-run setup steps."
      />
    );
  }

  return (
    <Card className="border-slate-200">
      {loadState === "partial" ? (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-warning" />
            <span>
              Some setup checks could not be loaded ({failedFields.join(", ")}). Incomplete steps below
              are based only on data that loaded successfully.
            </span>
          </div>
          <button
            type="button"
            onClick={() => void fetchSetup()}
            className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary hover:underline"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : null}

      {journey.readyForOperations ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-success" />
            <div>
              <p className="font-display text-sm font-semibold text-slate-900">Ready for operations</p>
              <p className="mt-1 text-xs text-slate-600">
                Required first-run setup for this school is complete. Staff can continue with attendance,
                homework, timetable, exams, and fees.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-semibold text-slate-900">School setup</h3>
            <Badge variant={journey.readyForOperations ? "present" : "late"}>
              {journey.completedCount} / {journey.steps.length} complete
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            First-run guidance from this school&apos;s live academic, people, and settings data.
          </p>
        </div>
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        {journey.steps.map((step) => (
          <div
            key={step.id}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              {step.status === "complete" ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
              ) : (
                <Circle size={18} className="mt-0.5 shrink-0 text-slate-300" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-900">{step.label}</p>
                <p className="text-xs text-slate-500">{step.detail}</p>
              </div>
            </div>
            <Link
              href={step.href}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline sm:self-center"
            >
              {step.actionText} <ArrowRight size={12} />
            </Link>
          </div>
        ))}
      </div>
    </Card>
  );
}
