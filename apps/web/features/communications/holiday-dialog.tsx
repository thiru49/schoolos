"use client";

import { useEffect, useState } from "react";
import { X, Sun } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { todayIso } from "../../lib/utils";

type HolidayDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    date: string;
    academicYearId?: string;
  }) => Promise<void>;
  knownAcademicYears?: string[];
};

export function HolidayDialog({
  isOpen,
  onClose,
  onSave,
  knownAcademicYears = [],
}: HolidayDialogProps) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayIso());
  const [academicYearId, setAcademicYearId] = useState("");
  const [customYearId, setCustomYearId] = useState("");
  const [useCustomYear, setUseCustomYear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName("");
      setDate(todayIso());
      setAcademicYearId("");
      setCustomYearId("");
      setUseCustomYear(false);
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Holiday name is required.");
      return;
    }
    if (!date) {
      setError("Holiday date is required.");
      return;
    }

    setSaving(true);
    setError("");

    // Determine academicYearId to send (optional)
    let yearToSend: string | undefined = undefined;
    if (useCustomYear && customYearId.trim()) {
      yearToSend = customYearId.trim();
    } else if (!useCustomYear && academicYearId.trim() && academicYearId !== "auto") {
      yearToSend = academicYearId.trim();
    }

    try {
      await onSave({
        name: name.trim(),
        date,
        ...(yearToSend ? { academicYearId: yearToSend } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record holiday");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-500" />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Add Official Holiday
              </h2>
              <p className="text-xs text-slate-500">
                Record a school holiday or observance date.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-danger">
              {error}
            </div>
          ) : null}

          <div>
            <label className="text-xs font-semibold text-slate-700">Holiday Name *</label>
            <Input
              type="text"
              placeholder="e.g. Gandhi Jayanti / Pongal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Date *</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">
              Academic Year (Optional)
            </label>
            {!useCustomYear ? (
              <select
                value={academicYearId}
                onChange={(e) => {
                  if (e.target.value === "custom") {
                    setUseCustomYear(true);
                  } else {
                    setAcademicYearId(e.target.value);
                  }
                }}
                className="mt-1 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="auto">Auto-detect Active Year (Recommended)</option>
                {knownAcademicYears.map((yrId) => (
                  <option key={yrId} value={yrId}>
                    Year ID: {yrId}
                  </option>
                ))}
                <option value="custom">+ Specify specific Academic Year ID</option>
              </select>
            ) : (
              <div className="mt-1 space-y-1">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter academic year UUID"
                    value={customYearId}
                    onChange={(e) => setCustomYearId(e.target.value)}
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setUseCustomYear(false);
                      setCustomYearId("");
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}
            <p className="mt-1 text-[11px] text-slate-400">
              When omitted, the active academic year will be automatically linked.
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : "Save Holiday"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
