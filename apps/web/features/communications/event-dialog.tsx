"use client";

import { useEffect, useState } from "react";
import { CalendarDays, FileEdit } from "lucide-react";
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
import type { EventItem } from "./communications-types";

type EventDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string | null;
    startDate: string;
    endDate: string;
    location?: string | null;
    published?: boolean;
  }) => Promise<void>;
  initialData?: Partial<EventItem> | null;
  isEditing: boolean;
};

export function EventDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing,
}: EventDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [location, setLocation] = useState("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title ?? "");
      setDescription(initialData?.description ?? "");
      setStartDate(initialData?.startDate?.slice(0, 10) ?? todayIso());
      setEndDate(initialData?.endDate?.slice(0, 10) ?? todayIso());
      setLocation(initialData?.location ?? "");
      setPublished(initialData?.published ?? false);
      setError("");
    }
  }, [isOpen, initialData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Event title is required.");
      return;
    }
    if (!startDate) {
      setError("Start date is required.");
      return;
    }
    if (!endDate) {
      setError("End date is required.");
      return;
    }
    if (startDate > endDate) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        startDate,
        endDate,
        location: location.trim() ? location.trim() : null,
        published,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <FileEdit className="h-5 w-5 text-primary" />
            ) : (
              <CalendarDays className="h-5 w-5 text-primary" />
            )}
            <div>
              <DialogTitle>
                {isEditing ? "Edit School Event" : "Create School Event"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Update event schedule, venue, or publish status."
                  : "Add an event to the school-wide calendar."}
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
            <label className="text-xs font-semibold text-slate-700">Event Title *</label>
            <Input
              type="text"
              placeholder="e.g. Annual Sports Meet 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Start Date *</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">End Date *</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Location / Venue</label>
            <Input
              type="text"
              placeholder="e.g. Main Ground / Auditorium"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Description</label>
            <textarea
              rows={4}
              placeholder="Event itinerary, dress code, participants info..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <input
              type="checkbox"
              id="event-published"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <label htmlFor="event-published" className="text-xs font-medium text-slate-700">
              Publish immediately (if unchecked, event is saved as a Draft)
            </label>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Update Event" : "Save Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
