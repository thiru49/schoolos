"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import {
  Sun,
  Plus,
  Search,
  Trash2,
  Calendar,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { Select } from "../../components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui/table";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import { HolidayDialog } from "./holiday-dialog";
import type { HolidayItem } from "./communications-types";

function formatHolidayDate(dateIso: string) {
  const [year, month, day] = dateIso.split("-");
  if (!year || !month || !day) return dateIso;
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function HolidaysBoard() {
  const { acl, branding } = useAppBranding();
  const canRead = acl.permissions.includes(PERMISSIONS.NOTICES_READ);
  const canManage = acl.permissions.includes(PERMISSIONS.HOLIDAYS_MANAGE);

  const activeYearLabel = useMemo(() => {
    if (branding.receiptPrefix && branding.receiptPrefix.includes("/")) {
      const segment = branding.receiptPrefix.split("/")[1]?.trim();
      if (segment) {
        return /^\d{2}-\d{2}$/.test(segment) ? `20${segment}` : segment;
      }
    }
    return "2026-27";
  }, [branding.receiptPrefix]);

  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");
  const [customYearFilter, setCustomYearFilter] = useState<string>("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHolidays = useCallback(async (yearId?: string) => {
    if (!canRead) {
      setState("denied");
      return;
    }
    setState("loading");
    setErrorMessage("");
    try {
      const list = await api().holidays.list(yearId);
      setHolidays(list);
      setState(list.length === 0 ? "empty" : "loaded");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setState("denied");
        setErrorMessage(err.message);
        return;
      }
      if (err instanceof TypeError) {
        setState("offline");
        setErrorMessage("You appear to be offline.");
        return;
      }
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to load holidays");
    }
  }, [canRead]);

  useEffect(() => {
    const filterParam =
      selectedYearFilter === "all"
        ? undefined
        : selectedYearFilter === "custom"
        ? customYearFilter || undefined
        : selectedYearFilter;
    void loadHolidays(filterParam);
  }, [loadHolidays, selectedYearFilter, customYearFilter]);

  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return h.name.toLowerCase().includes(q) || h.date.includes(q);
      }
      return true;
    });
  }, [holidays, search]);

  async function handleSaveHoliday(data: {
    name: string;
    date: string;
    academicYearId?: string;
  }) {
    await api().holidays.create(data);
    toast.success("Holiday scheduled");
    const filterParam =
      selectedYearFilter === "all"
        ? undefined
        : selectedYearFilter === "custom"
        ? customYearFilter || undefined
        : selectedYearFilter;
    await loadHolidays(filterParam);
  }

  async function handleDeleteHoliday(id: string) {
    if (!window.confirm("Are you sure you want to remove this holiday?")) return;
    setDeletingId(id);
    try {
      await api().holidays.remove(id);
      toast.success("Holiday removed");
      const filterParam =
        selectedYearFilter === "all"
          ? undefined
          : selectedYearFilter === "custom"
          ? customYearFilter || undefined
          : selectedYearFilter;
      await loadHolidays(filterParam);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete holiday");
    } finally {
      setDeletingId(null);
    }
  }

  if (state === "denied" || !canRead) {
    return <PermissionDenied detail={errorMessage || "You do not have permission to view holidays."} />;
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} onRetry={() => void loadHolidays()} />;
  }

  if (state === "offline") {
    return <ErrorState message="You appear to be offline. Please check your network connection." onRetry={() => void loadHolidays()} />;
  }

  return (
    <div className="space-y-5">
      {/* Top Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search holidays..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Academic Year Filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400" />
            <Select
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              className="h-10 w-auto text-xs"
            >
              <option value="all">All Academic Years</option>
              <option value="active">Active Year ({activeYearLabel})</option>
              <option value="custom">Filter by Year ID...</option>
            </Select>
            {selectedYearFilter === "custom" ? (
              <Input
                placeholder="Enter Year UUID"
                value={customYearFilter}
                onChange={(e) => setCustomYearFilter(e.target.value)}
                className="h-10 text-xs w-44"
              />
            ) : null}
          </div>
        </div>

        {/* Action Button */}
        {canManage ? (
          <Button
            variant="primary"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Holiday
          </Button>
        ) : null}
      </div>

      {/* Content */}
      {state === "loading" ? (
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : holidays.length === 0 ? (
        <EmptyState
          title="No holidays scheduled"
          detail={
            canManage
              ? "Schedule your first official school holiday using the Add Holiday button above."
              : "No holidays have been scheduled for this academic period."
          }
        />
      ) : filteredHolidays.length === 0 ? (
        <EmptyState
          title="No matching holidays"
          detail="No holidays match the selected search or academic year filter."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-display text-base font-semibold text-slate-800">
              School Holidays Calendar
            </h3>
            <p className="text-xs text-slate-400">
              {filteredHolidays.length} holiday{filteredHolidays.length === 1 ? "" : "s"} scheduled
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Holiday Name</TableHead>
                <TableHead>Academic Year</TableHead>
                {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHolidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell className="whitespace-nowrap text-xs font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-amber-500" />
                      <span>{formatHolidayDate(holiday.date)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <Sun size={14} className="text-amber-500" />
                      <span>{holiday.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-slate-500">
                    <Badge variant="muted">
                      {holiday.academicYearId
                        ? `Academic Year (${activeYearLabel})`
                        : `Active Year (${activeYearLabel})`}
                    </Badge>
                  </TableCell>
                  {canManage ? (
                    <TableCell className="whitespace-nowrap text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-600 hover:text-danger"
                        disabled={deletingId === holiday.id}
                        onClick={() => void handleDeleteHoliday(holiday.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Holiday Dialog */}
      <HolidayDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveHoliday}
      />
    </div>
  );
}
