"use client";

import { useEffect, useState } from "react";
import { Send, FileEdit } from "lucide-react";
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <FileEdit className="h-5 w-5 text-primary" />
            ) : (
              <Send className="h-5 w-5 text-primary" />
            )}
            <div>
              <DialogTitle>{isEditing ? "Edit Notice" : "Create Notice"}</DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Update announcement details or publish status."
                  : "Publish an announcement to students, parents, or staff."}
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
            <Select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="mt-1"
            >
              <option value="all">Everyone (School-wide)</option>
              <option value="student">Students only</option>
              <option value="parent">Parents only</option>
              <option value="teacher">Teachers / Staff only</option>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Notice Content *</label>
            <textarea
              rows={5}
              placeholder="Enter full notice body text..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1 flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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

          <DialogFooter>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Update Notice" : "Save Notice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
