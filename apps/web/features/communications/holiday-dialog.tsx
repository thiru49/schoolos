"use client";

import { useEffect, useMemo, useState } from "react";
import { Sun } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "../../components/ui/dialog";
import { useAppBranding } from "../../lib/branding-context";
import { todayIso } from "../../lib/utils";

type HolidayDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    date: string;
    academicYearId?: string;
  }) => Promise<void>;
};

export function HolidayDialog({
  isOpen,
  onClose,
  onSave,
}: HolidayDialogProps) {
  const { branding } = useAppBranding();
  const activeYearLabel = useMemo(() => {
    if (branding.receiptPrefix && branding.receiptPrefix.includes("/")) {
      const segment = branding.receiptPrefix.split("/")[1]?.trim();
      if (segment) {
        return /^\d{2}-\d{2}$/.test(segment) ? `20${segment}` : segment;
      }
    }
    return "2026-27";
  }, [branding.receiptPrefix]);

  const [name, setName] = useState("");
  const [date, setDate] = useState(todayIso());
  const [yearOption, setYearOption] = useState<string>("auto");
  const [customYearId, setCustomYearId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName("");
      setDate(todayIso());
      setYearOption("auto");
      setCustomYearId("");
      setError("");
    }
  }, [isOpen]);

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

    // Optional academicYearId handling
    let yearToSend: string | undefined = undefined;
    if (yearOption === "custom" && customYearId.trim()) {
      yearToSend = customYearId.trim();
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-500" />
            <div>
              <DialogTitle>Add Official Holiday</DialogTitle>
              <DialogDescription>
                Record a school holiday, national observance, or term break.
              </DialogDescription>
            </div>
          </div>
          <DialogClose onClick={onClose} />
        </DialogHeader>

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
            <Select
              value={yearOption}
              onChange={(e) => setYearOption(e.target.value)}
              className="mt-1"
            >
              <option value="auto">
                Active Year ({activeYearLabel}) — Auto-assigned
              </option>
              <option value="custom">Specific Academic Year ID</option>
            </Select>
            {yearOption === "custom" ? (
              <div className="mt-2">
                <Input
                  placeholder="Enter Academic Year ID (UUID)"
                  value={customYearId}
                  onChange={(e) => setCustomYearId(e.target.value)}
                  className="text-xs"
                />
              </div>
            ) : null}
            <p className="mt-1 text-[11px] text-slate-400">
              When omitted, SchoolOS automatically associates this holiday with the active academic year ({activeYearLabel}).
            </p>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : "Save Holiday"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
