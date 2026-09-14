"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@schoolos/api-client";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import { canManageSubjects } from "./academics-policy";

type SubjectItem = { id: string; name: string };

export function SubjectsBoard() {
  const { acl } = useAppBranding();
  const canManage = canManageSubjects(acl);

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectItem | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSubjects = useCallback(async () => {
    if (!canManage) {
      setState("denied");
      return;
    }
    setState("loading");
    setErrorMessage("");
    try {
      const list = await api().academics.subjects.list();
      setSubjects(list);
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
      setErrorMessage(err instanceof Error ? err.message : "Failed to load subjects");
    }
  }, [canManage]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => s.name.toLowerCase().includes(q));
  }, [subjects, search]);

  function openCreate() {
    setEditing(null);
    setName("");
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(subject: SubjectItem) {
    setEditing(subject);
    setName(subject.name);
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Subject name is required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await api().academics.subjects.update(editing.id, name.trim());
        toast.success("Subject updated");
      } else {
        await api().academics.subjects.create(name.trim());
        toast.success("Subject created");
      }
      setDialogOpen(false);
      await loadSubjects();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save subject");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this subject? It cannot be removed if used in timetable or exams.")) return;
    setDeletingId(id);
    try {
      await api().academics.subjects.remove(id);
      toast.success("Subject deleted");
      await loadSubjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete subject");
    } finally {
      setDeletingId(null);
    }
  }

  if (state === "denied" || !canManage) {
    return (
      <PermissionDenied detail={errorMessage || "You do not have permission to manage subjects."} />
    );
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} onRetry={() => void loadSubjects()} />;
  }

  if (state === "offline") {
    return (
      <ErrorState
        message="You appear to be offline. Please check your network connection."
        onRetry={() => void loadSubjects()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add subject
        </Button>
      </div>

      {state === "loading" ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : state === "empty" ? (
        <EmptyState
          title="No subjects"
          detail="Create your school subject catalog using the Add subject button above."
        />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No subjects match your search.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((subject) => (
              <TableRow key={subject.id}>
                <TableCell className="font-medium">{subject.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(subject)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === subject.id}
                      onClick={() => void handleDelete(subject.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={(e) => void handleSave(e)}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit subject" : "Add subject"}</DialogTitle>
              <DialogDescription>Example: Mathematics, Tamil, Science</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <Input
                placeholder="Subject name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" disabled={saving} onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
