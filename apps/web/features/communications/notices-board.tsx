"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import {
  MessageSquare,
  Plus,
  Search,
  Pencil,
  Trash2,
  Globe,
  GraduationCap,
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import { NoticeDialog } from "./notice-dialog";
import type { NoticeItem } from "./communications-types";
import type { NoticeTargetRole } from "@schoolos/api-client";

function audienceBadge(role: NoticeTargetRole) {
  switch (role) {
    case "student":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          <GraduationCap size={12} /> Students
        </span>
      );
    case "parent":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
          <Users size={12} /> Parents
        </span>
      );
    case "teacher":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          <UserCheck size={12} /> Teachers
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          <Globe size={12} /> Everyone
        </span>
      );
  }
}

export function NoticesBoard() {
  const { acl } = useAppBranding();
  const canRead = acl.permissions.includes(PERMISSIONS.NOTICES_READ);
  const canWrite = acl.permissions.includes(PERMISSIONS.NOTICES_WRITE);

  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadNotices = useCallback(async () => {
    if (!canRead) {
      setState("denied");
      return;
    }
    setState("loading");
    setErrorMessage("");
    try {
      const list = await api().notices.list();
      setNotices(list);
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
      setErrorMessage(err instanceof Error ? err.message : "Failed to load notices");
    }
  }, [canRead]);

  useEffect(() => {
    void loadNotices();
  }, [loadNotices]);

  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      if (statusFilter === "published" && !n.published) return false;
      if (statusFilter === "draft" && n.published) return false;

      if (roleFilter !== "all") {
        if (roleFilter === "everyone" && n.targetRole !== null && n.targetRole !== "all") return false;
        if (roleFilter !== "everyone" && n.targetRole !== roleFilter) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
      }

      return true;
    });
  }, [notices, statusFilter, roleFilter, search]);

  async function handleSaveNotice(data: {
    title: string;
    body: string;
    targetRole?: NoticeTargetRole;
    published?: boolean;
  }) {
    if (editingNotice) {
      await api().notices.update(editingNotice.id, data);
      toast.success("Notice updated");
    } else {
      await api().notices.create(data);
      toast.success(data.published ? "Notice published" : "Draft notice saved");
    }
    await loadNotices();
  }

  async function handleTogglePublish(notice: NoticeItem) {
    try {
      const newStatus = !notice.published;
      await api().notices.update(notice.id, { published: newStatus });
      toast.success(newStatus ? "Notice published" : "Notice unpublished (saved as draft)");
      await loadNotices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update notice status");
    }
  }

  async function handleDeleteNotice(id: string) {
    if (!window.confirm("Are you sure you want to delete this notice?")) return;
    setDeletingId(id);
    try {
      await api().notices.remove(id);
      toast.success("Notice deleted");
      await loadNotices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete notice");
    } finally {
      setDeletingId(null);
    }
  }

  if (state === "denied" || !canRead) {
    return <PermissionDenied detail={errorMessage || "You do not have permission to view notices."} />;
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} onRetry={() => void loadNotices()} />;
  }

  if (state === "offline") {
    return <ErrorState message="You appear to be offline. Please check your network connection." onRetry={() => void loadNotices()} />;
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
              placeholder="Search notices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "published" | "draft")}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-primary focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>

          {/* Audience Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-primary focus:outline-none"
          >
            <option value="all">All Audiences</option>
            <option value="everyone">Everyone</option>
            <option value="student">Students</option>
            <option value="parent">Parents</option>
            <option value="teacher">Teachers</option>
          </select>
        </div>

        {/* Action Button */}
        {canWrite ? (
          <Button
            variant="primary"
            onClick={() => {
              setEditingNotice(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Notice
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
      ) : notices.length === 0 ? (
        <EmptyState
          title="No notices found"
          detail={
            canWrite
              ? "Create your first notice or announcement using the New Notice button above."
              : "No notices have been published to your audience yet."
          }
        />
      ) : filteredNotices.length === 0 ? (
        <EmptyState
          title="No matching notices"
          detail="No notices match the selected search and filter criteria."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-display text-base font-semibold text-slate-800">
              Notices & Circulars
            </h3>
            <p className="text-xs text-slate-400">
              {filteredNotices.length} notice{filteredNotices.length === 1 ? "" : "s"} found
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Notice</th>
                  <th className="px-5 py-3">Audience</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Author</th>
                  <th className="px-5 py-3">Date</th>
                  {canWrite ? <th className="px-5 py-3 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNotices.map((notice) => (
                  <tr key={notice.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="max-w-xs px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{notice.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{notice.body}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      {audienceBadge(notice.targetRole)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      {notice.published ? (
                        <div className="flex flex-col">
                          <Badge variant="published" className="w-fit">
                            Published
                          </Badge>
                          {notice.publishedAt ? (
                            <span className="mt-1 text-[11px] text-slate-400">
                              {new Date(notice.publishedAt).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <Badge variant="muted" className="w-fit">
                          Draft
                        </Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-600">
                      {notice.authorName || "Staff"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-500">
                      {new Date(notice.createdAt).toLocaleDateString()}
                    </td>
                    {canWrite ? (
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => void handleTogglePublish(notice)}
                          >
                            {notice.published ? "Unpublish" : "Publish"}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-600 hover:text-primary"
                            onClick={() => {
                              setEditingNotice(notice);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-600 hover:text-danger"
                            disabled={deletingId === notice.id}
                            onClick={() => void handleDeleteNotice(notice.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <NoticeDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingNotice(null);
        }}
        onSave={handleSaveNotice}
        initialData={editingNotice}
        isEditing={Boolean(editingNotice)}
      />
    </div>
  );
}
