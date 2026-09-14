"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Skeleton } from "../../components/ui/skeleton";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import {
  getAvailableDashboardRoles,
  resolveDefaultDashboardRole,
  type DashboardRole,
} from "./dashboard-policy";
import { RoleSwitcher } from "./role-switcher";
import { SuperAdminView, type SuperAdminData } from "./super-admin-view";
import { SchoolAdminView, type SchoolAdminData } from "./school-admin-view";
import { AccountsAdminView, type AccountsAdminData } from "./accounts-admin-view";
import { TeacherLandingView } from "./teacher-landing-view";

export function DashboardView() {
  const { acl } = useAppBranding();

  const availableRoles = useMemo(() => getAvailableDashboardRoles(acl.roles), [acl.roles]);
  const defaultRole = useMemo(() => resolveDefaultDashboardRole(acl.roles), [acl.roles]);

  const [activeRole, setActiveRole] = useState<DashboardRole>(defaultRole);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Role-specific datasets
  const [superAdminData, setSuperAdminData] = useState<SuperAdminData | null>(null);
  const [schoolAdminData, setSchoolAdminData] = useState<SchoolAdminData | null>(null);
  const [accountsAdminData, setAccountsAdminData] = useState<AccountsAdminData | null>(null);

  const fetchDashboardData = useCallback(async (role: DashboardRole) => {
    setLoading(true);
    setError(null);

    try {
      if (role === "school_super_admin") {
        const [
          yearsRes,
          classesRes,
          sectionsRes,
          subjectsRes,
          studentsRes,
          teachersRes,
          parentsRes,
        ] = await Promise.allSettled([
          api().academics.years.list(),
          api().academics.classes.list(),
          api().academics.sections(),
          api().subjects.list(),
          api().students.list(),
          api().teachers.list(),
          api().parents.list(),
        ]);

        const academicYears = yearsRes.status === "fulfilled" ? yearsRes.value : [];
        const classes = classesRes.status === "fulfilled" ? classesRes.value : [];
        const sections = sectionsRes.status === "fulfilled" ? sectionsRes.value : [];
        const subjects = subjectsRes.status === "fulfilled" ? subjectsRes.value : [];
        const studentCount = studentsRes.status === "fulfilled" ? studentsRes.value.length : 0;
        const teacherCount = teachersRes.status === "fulfilled" ? teachersRes.value.length : 0;
        const parentCount = parentsRes.status === "fulfilled" ? parentsRes.value.length : 0;

        // If every single call was rejected, treat as error
        const allFailed = [
          yearsRes,
          classesRes,
          sectionsRes,
          subjectsRes,
          studentsRes,
          teachersRes,
          parentsRes,
        ].every((r) => r.status === "rejected");

        if (allFailed) {
          const firstErr = (yearsRes as PromiseRejectedResult).reason;
          throw firstErr instanceof Error ? firstErr : new Error("Failed to load dashboard data");
        }

        setSuperAdminData({
          academicYears,
          classes,
          sections,
          subjects,
          studentCount,
          teacherCount,
          parentCount,
        });
      } else if (role === "school_admin") {
        const [studentsRes, teachersRes, sectionsRes] = await Promise.allSettled([
          api().students.list(),
          api().teachers.list(),
          api().academics.sections(),
        ]);

        const studentCount = studentsRes.status === "fulfilled" ? studentsRes.value.length : 0;
        const teacherCount = teachersRes.status === "fulfilled" ? teachersRes.value.length : 0;
        const sections = sectionsRes.status === "fulfilled" ? sectionsRes.value : [];

        setSchoolAdminData({
          studentCount,
          teacherCount,
          sections,
        });
      } else if (role === "accounts_admin") {
        const [headsRes, paymentsRes] = await Promise.allSettled([
          api().fees.heads(),
          api().fees.list(),
        ]);

        const allFailed = headsRes.status === "rejected" && paymentsRes.status === "rejected";
        if (allFailed) {
          const firstErr = (headsRes as PromiseRejectedResult).reason;
          throw firstErr instanceof Error ? firstErr : new Error("Failed to load fee information");
        }

        const feeHeads = headsRes.status === "fulfilled" ? headsRes.value : [];
        const recentPayments = paymentsRes.status === "fulfilled" ? paymentsRes.value : [];

        setAccountsAdminData({
          feeHeads,
          recentPayments,
        });
      } else if (role === "teacher") {
        // Teacher is lightweight web orientation; no heavy queries needed
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeRole !== "other") {
      void fetchDashboardData(activeRole);
    } else {
      setLoading(false);
    }
  }, [activeRole, fetchDashboardData]);

  // Denied state if no valid role exists
  if (availableRoles.length === 0 || activeRole === "other") {
    return (
      <PermissionDenied detail="Your user account does not have access to any school administration dashboard views. Contact your school administrator." />
    );
  }

  return (
    <div className="space-y-6">
      {/* Role Switcher Toolbar for Multi-Role Users */}
      {availableRoles.length > 1 ? (
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <p className="text-xs text-slate-500">
            Multi-role profile: Select an operational dashboard view.
          </p>
          <RoleSwitcher
            availableRoles={availableRoles}
            activeRole={activeRole}
            onSelectRole={(role) => setActiveRole(role)}
          />
        </div>
      ) : null}

      {/* Loading State */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : error ? (
        /* Error State with Retry (never logs out user) */
        <ErrorState message={error} onRetry={() => void fetchDashboardData(activeRole)} />
      ) : activeRole === "school_super_admin" && superAdminData ? (
        <SuperAdminView data={superAdminData} />
      ) : activeRole === "school_admin" && schoolAdminData ? (
        <SchoolAdminView data={schoolAdminData} />
      ) : activeRole === "accounts_admin" && accountsAdminData ? (
        <AccountsAdminView data={accountsAdminData} />
      ) : activeRole === "teacher" ? (
        <TeacherLandingView />
      ) : null}
    </div>
  );
}
