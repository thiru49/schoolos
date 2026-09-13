"use client";

import { useEffect, useState } from "react";
import { X, Send, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import type { NoticeItem } from "./communications-types";
import type { NoticeTargetRole } from "@schoolos/api-client";

type NoticeDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    body: string;
    targetRole?: NoticeTargetRole;
    published?: boolean;
  }) => Promise<void>;
  initialData?: Partial<NoticeItem> | null;
  isEditing: boolean;
};

export function NoticeDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing,
}: NoticeDialogProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetRole, setTargetRole] = useState<string>("all");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title ?? "");
      setBody(initialData?.body ?? "");
      const role = initialData?.targetRole;
      setTargetRole(role && role !== "all" ? role : "all");
      setPublished(initialData?.published ?? false);
      setError("");
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Notice title is required.");
      return;
    }
    if (!body.trim()) {
      setError("Notice content is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const canonicalTargetRole: NoticeTargetRole =
        targetRole === "all" ? null : (targetRole as "student" | "parent" | "teacher");

      await onSave({
        title: title.trim(),
        body: body.trim(),
        targetRole: canonicalTargetRole,
        published,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notice");
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
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <FileEdit className="h-5 w-5 text-primary" />
            ) : (
              <Send className="h-5 w-5 text-primary" />
            )}
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                {isEditing ? "Edit Notice" : "Create Notice"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? "Update announcement details or publish status."
                  : "Publish an announcement to students, parents, or staff."}
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
            <label className="text-xs font-semibold text-slate-700">Notice Title *</label>
            <Input
              type="text"
              placeholder="e.g. Annual Sports Day Announcement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Target Audience</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Everyone (School-wide)</option>
              <option value="student">Students only</option>
              <option value="parent">Parents only</option>
              <option value="teacher">Teachers / Staff only</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Notice Content *</label>
            <textarea
              rows={5}
              placeholder="Enter full notice body text..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1 flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <input
              type="checkbox"
              id="notice-published"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <label htmlFor="notice-published" className="text-xs font-medium text-slate-700">
              Publish immediately (if unchecked, notice is saved as a Draft)
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Update Notice" : "Save Notice"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
