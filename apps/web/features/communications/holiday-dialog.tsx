"use client";

import { useEffect, useState } from "react";
import { Sun, Info } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "../../components/ui/dialog";
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
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName("");
      setDate(todayIso());
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

    try {
      // academicYearId is omitted so backend auto-resolves the active academic year
      await onSave({
        name: name.trim(),
        date,
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

          <div className="flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50/70 p-3 text-xs text-slate-600">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-primary">Academic Year Auto-resolution</p>
              <p className="mt-0.5 text-slate-500">
                The backend automatically links this holiday to the school&apos;s active academic year.
              </p>
            </div>
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
