"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  DAYS,
  DEFAULT_BELL_SLOTS,
  periodsOverlap,
  type Period,
  type Subject,
  type Teacher,
} from "./timetable-types";

type TimetablePeriodDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    subjectId: string;
    teacherId: string;
    weekday: number;
    startTime: string;
    endTime: string;
  }) => Promise<void>;
  initialData?: Partial<Period> | null;
  subjects: Subject[];
  teachers: Teacher[];
  onCreateSubject?: (name: string) => Promise<Subject | null>;
  allPeriods?: Period[];
  isEditing: boolean;
  onDelete?: () => Promise<void>;
};

export function TimetablePeriodDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
  subjects,
  teachers,
  onCreateSubject,
  allPeriods = [],
  isEditing,
  onDelete,
}: TimetablePeriodDialogProps) {
  const [weekday, setWeekday] = useState<number>(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:45");
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Inline subject creation state
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWeekday(initialData?.weekday ?? 1);
      setStartTime(initialData?.startTime ?? "09:00");
      setEndTime(initialData?.endTime ?? "09:45");
      setSubjectId(initialData?.subjectId ?? (subjects[0]?.id || ""));
      setTeacherId(initialData?.teacherId ?? (teachers[0]?.id || ""));
      setShowConfirmDelete(false);
      setShowNewSubject(false);
      setNewSubjectName("");
    }
  }, [isOpen, initialData, subjects, teachers]);

  // Informational teacher conflict warning
  const teacherConflict = useMemo(() => {
    if (!teacherId || !startTime || !endTime) return null;
    const conflicting = allPeriods.find((p) => {
      if (initialData?.id && p.id === initialData.id) return false;
      return (
        p.teacherId === teacherId &&
        p.weekday === weekday &&
        periodsOverlap(startTime, endTime, p.startTime, p.endTime)
      );
    });
    return conflicting || null;
  }, [allPeriods, teacherId, weekday, startTime, endTime, initialData?.id]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      toast.error("Please select a subject");
      return;
    }
    if (!teacherId) {
      toast.error("Please select a teacher");
      return;
    }
    if (startTime >= endTime) {
      toast.error("Start time must be before end time");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        subjectId,
        teacherId,
        weekday,
        startTime,
        endTime,
      });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save period");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim() || !onCreateSubject) return;
    setIsCreatingSubject(true);
    try {
      const created = await onCreateSubject(newSubjectName.trim());
      if (created) {
        setSubjectId(created.id);
        setNewSubjectName("");
        setShowNewSubject(false);
        toast.success(`Subject "${created.name}" created`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create subject");
    } finally {
      setIsCreatingSubject(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete period");
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedTeacher = teachers.find((t) => t.id === teacherId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              {isEditing ? "Edit Timetable Period" : "Schedule New Period"}
            </h2>
            <p className="text-xs text-slate-500">
              {isEditing
                ? "Update period details. Note: Changes revert to draft status until published."
                : "Assign subject, teacher, and bell timing slot."}
            </p>
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

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* Weekday Selection */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Day of Week
            </label>
            <div className="mt-1.5 grid grid-cols-6 gap-1.5 sm:grid-cols-7">
              {DAYS.map((d) => (
                <button
                  key={d.weekday}
                  type="button"
                  onClick={() => setWeekday(d.weekday)}
                  className={`rounded-lg py-2 text-xs font-semibold transition ${
                    weekday === d.weekday
                      ? "bg-primary text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {d.short}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Bell Schedule Slots */}
          <div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Clock size={13} />
                Quick Bell Schedule Presets
              </label>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {DEFAULT_BELL_SLOTS.map((slot) => {
                const isSelected = startTime === slot.startTime && endTime === slot.endTime;
                return (
                  <button
                    key={slot.slotNumber}
                    type="button"
                    onClick={() => {
                      setStartTime(slot.startTime);
                      setEndTime(slot.endTime);
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      isSelected
                        ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {slot.label} ({slot.startTime}–{slot.endTime})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Start Time</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">End Time</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Subject Selector */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">Subject</label>
              {onCreateSubject && !showNewSubject ? (
                <button
                  type="button"
                  onClick={() => setShowNewSubject(true)}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Plus size={12} />
                  New Subject
                </button>
              ) : null}
            </div>

            {showNewSubject ? (
              <div className="mt-1 flex gap-2">
                <Input
                  placeholder="Subject name (e.g. Mathematics)"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateSubject}
                  disabled={isCreatingSubject || !newSubjectName.trim()}
                >
                  {isCreatingSubject ? "Adding..." : "Add"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNewSubject(false);
                    setNewSubjectName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <select
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-primary focus:outline-none"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select Subject
                </option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Teacher Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-600">Teacher</label>
            <select
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-primary focus:outline-none"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select Teacher
              </option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName} ({t.employeeId})
                </option>
              ))}
            </select>
          </div>

          {/* Informational Teacher Conflict Warning */}
          {teacherConflict ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <span className="font-semibold">Teacher Schedule Conflict Warning:</span>{" "}
                  {selectedTeacher?.fullName || "This teacher"} is already assigned to{" "}
                  <span className="font-medium">
                    {teacherConflict.label || "another period"}
                  </span>{" "}
                  on {DAYS.find((d) => d.weekday === weekday)?.name || `Day ${weekday}`} from{" "}
                  <span className="font-medium">
                    {teacherConflict.startTime} to {teacherConflict.endTime}
                  </span>
                  .
                  <p className="mt-1 text-amber-700/80">
                    This warning is informational. Backend validation and section integrity will
                    apply upon saving.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <div>
              {isEditing && onDelete ? (
                showConfirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-danger">Delete period?</span>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Yes, Delete"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowConfirmDelete(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-red-50 hover:text-danger"
                    onClick={() => setShowConfirmDelete(true)}
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    Delete Period
                  </Button>
                )
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Saving..."
                  : isEditing
                  ? "Update Period"
                  : "Save Period"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
