"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Edit2,
  LayoutGrid,
  ListFilter,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  DAYS,
  DEFAULT_BELL_SLOTS,
  type BellSlot,
  type Period,
} from "./timetable-types";

type TimetableGridProps = {
  periods: Period[];
  canWrite: boolean;
  onEditPeriod: (period: Period) => void;
  onDeletePeriod: (id: string) => void;
  onAddPeriodSlot: (weekday: number, startTime: string, endTime: string) => void;
};

export function TimetableGrid({
  periods,
  canWrite,
  onEditPeriod,
  onDeletePeriod,
  onAddPeriodSlot,
}: TimetableGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Check if Sunday has any periods
  const hasSunday = useMemo(() => periods.some((p) => p.weekday === 7), [periods]);
  const activeDays = useMemo(() => (hasSunday ? DAYS : DAYS.slice(0, 6)), [hasSunday]);

  // Derive consolidated list of time slots from default slots + any custom period intervals
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

  return (
    <div className="space-y-4">
      {/* View Mode Toggle Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar size={14} className="text-slate-400" />
          <span>Showing weekly schedule for {activeDays.length} working days</span>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
              viewMode === "grid"
                ? "bg-primary text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid size={13} />
            Weekly Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
              viewMode === "list"
                ? "bg-primary text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ListFilter size={13} />
            Day List
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        /* Weekly Grid Matrix */
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="w-36 p-3.5 pl-4">Time Slot</th>
                {activeDays.map((d) => (
                  <th key={d.weekday} className="p-3.5 text-center">
                    <div>{d.name}</div>
                    <div className="text-[10px] font-normal text-slate-400">{d.short}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {slots.map((slot) => (
                <tr key={slot.startTime} className="hover:bg-slate-50/40 transition">
                  {/* Slot Time Header */}
                  <td className="w-36 border-r border-slate-100 bg-slate-50/50 p-3 pl-4 align-top">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Clock size={13} className="text-slate-400" />
                      {slot.startTime} – {slot.endTime}
                    </div>
                    <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                      {slot.label}
                    </div>
                  </td>

                  {/* Day Cells */}
                  {activeDays.map((d) => {
                    const period = periods.find(
                      (p) => p.weekday === d.weekday && p.startTime === slot.startTime,
                    );

                    return (
                      <td
                        key={d.weekday}
                        className="border-r border-slate-100 p-2 align-top last:border-r-0"
                      >
                        {period ? (
                          /* Period Card */
                          <div
                            className={`group relative rounded-xl border p-3 transition shadow-2xs ${
                              period.published
                                ? "border-slate-200 bg-white hover:border-primary/40 hover:shadow-sm"
                                : "border-amber-300 bg-amber-50/40 hover:border-amber-400 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-display text-sm font-bold text-slate-900 leading-tight">
                                {period.subjectName}
                              </span>
                              {period.published ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                  Published
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                                  Draft
                                </span>
                              )}
                            </div>

                            <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-600">
                              <User size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate">{period.teacherName}</span>
                            </div>

                            <div className="mt-1 text-[11px] text-slate-400">
                              {period.startTime}–{period.endTime}
                            </div>

                            {/* Actions on hover */}
                            {canWrite ? (
                              <div className="mt-2.5 flex items-center gap-1 border-t border-slate-100 pt-2 opacity-90 transition group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => onEditPeriod(period)}
                                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                >
                                  <Edit2 size={11} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeletePeriod(period.id)}
                                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-danger hover:bg-red-50"
                                >
                                  <Trash2 size={11} />
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : canWrite ? (
                          /* Empty Slot with Quick Add */
                          <button
                            type="button"
                            onClick={() => onAddPeriodSlot(d.weekday, slot.startTime, slot.endTime)}
                            className="group flex h-24 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/30 p-2 text-slate-400 transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                          >
                            <Plus size={16} className="transition group-hover:scale-110" />
                            <span className="mt-1 text-[11px] font-medium opacity-0 transition group-hover:opacity-100">
                              Add Period
                            </span>
                          </button>
                        ) : (
                          /* Read-only Empty Cell */
                          <div className="flex h-24 items-center justify-center text-xs text-slate-300">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Chronological Day List View */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeDays.map((d) => {
            const dayPeriods = periods
              .filter((p) => p.weekday === d.weekday)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div
                key={d.weekday}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="font-display text-sm font-bold text-slate-900">{d.name}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {dayPeriods.length} {dayPeriods.length === 1 ? "Period" : "Periods"}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {dayPeriods.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No periods scheduled
                    </div>
                  ) : (
                    dayPeriods.map((p) => (
                      <div
                        key={p.id}
                        className={`rounded-xl border p-2.5 transition ${
                          p.published
                            ? "border-slate-100 bg-slate-50/50 hover:border-slate-200"
                            : "border-amber-200 bg-amber-50/40 hover:border-amber-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-semibold text-slate-900 text-xs">
                            {p.subjectName}
                          </span>
                          {p.published ? (
                            <span className="text-[10px] font-medium text-emerald-700">
                              Published
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700">Draft</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{p.teacherName}</span>
                          <span>
                            {p.startTime}–{p.endTime}
                          </span>
                        </div>
                        {canWrite ? (
                          <div className="mt-2 flex justify-end gap-2 border-t border-slate-100 pt-1.5">
                            <button
                              type="button"
                              onClick={() => onEditPeriod(p)}
                              className="text-[11px] font-medium text-primary hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeletePeriod(p.id)}
                              className="text-[11px] font-medium text-danger hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
