"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@schoolos/api-client";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
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
import { canManageClasses } from "./academics-policy";

type ClassItem = {
  id: string;
  name: string;
  academicYearId: string;
  academicYearName?: string;
  sections: { id: string; name: string; classId: string }[];
};

type YearItem = { id: string; name: string; isActive: boolean };

export function ClassesSectionsBoard() {
  const { acl } = useAppBranding();
  const canManage = canManageClasses(acl);

  const [years, setYears] = useState<YearItem[]>([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [sectionClassId, setSectionClassId] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);

  const loadYears = useCallback(async () => {
    try {
      const list = await api().academics.years.list();
      setYears(list);
      const active = list.find((y) => y.isActive) ?? list[0];
      if (active) setSelectedYearId(active.id);
    } catch {
      /* year list is optional until classes load */
    }
  }, []);

  const loadClasses = useCallback(async () => {
    if (!canManage) {
      setState("denied");
      return;
    }
    setState("loading");
    setErrorMessage("");
    try {
      const list = await api().academics.classes.list(selectedYearId || undefined);
      setClasses(list);
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
      setErrorMessage(err instanceof Error ? err.message : "Failed to load classes");
    }
  }, [canManage, selectedYearId]);

  useEffect(() => {
    void loadYears();
  }, [loadYears]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  const yearOptions = useMemo(() => years, [years]);

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    if (!className.trim()) {
      setFormError("Class name is required.");
      return;
    }
    if (!selectedYearId) {
      setFormError("Select an academic year first.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await api().academics.classes.create({
        academicYearId: selectedYearId,
        name: className.trim(),
      });
      toast.success("Class created");
      setClassDialogOpen(false);
      setClassName("");
      await loadClasses();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create class");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSection(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionName.trim() || !sectionClassId) {
      setFormError("Section name and class are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await api().academics.sectionsManage.create({
        classId: sectionClassId,
        name: sectionName.trim(),
      });
      toast.success("Section created");
      setSectionDialogOpen(false);
      setSectionName("");
      await loadClasses();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create section");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteClass(id: string) {
    if (!window.confirm("Delete this class? Only empty classes can be removed.")) return;
    setDeletingClassId(id);
    try {
      await api().academics.classes.remove(id);
      toast.success("Class deleted");
      await loadClasses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete class");
    } finally {
      setDeletingClassId(null);
    }
  }

  async function handleDeleteSection(id: string) {
    if (!window.confirm("Delete this section? Only empty sections can be removed.")) return;
    setDeletingSectionId(id);
    try {
      await api().academics.sectionsManage.remove(id);
      toast.success("Section deleted");
      await loadClasses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete section");
    } finally {
      setDeletingSectionId(null);
    }
  }

  if (state === "denied" || !canManage) {
    return (
      <PermissionDenied detail={errorMessage || "You do not have permission to manage classes and sections."} />
    );
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} onRetry={() => void loadClasses()} />;
  }

  if (state === "offline") {
    return (
      <ErrorState
        message="You appear to be offline. Please check your network connection."
        onRetry={() => void loadClasses()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {yearOptions.length > 0 && (
            <select
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
            >
              {yearOptions.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}{y.isActive ? " (active)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSectionDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add section
          </Button>
          <Button size="sm" onClick={() => setClassDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add class
          </Button>
        </div>
      </div>

      {state === "loading" ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : state === "empty" ? (
        <EmptyState
          title="No classes yet"
          detail="Add classes and sections for the selected academic year using the buttons above."
        />
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => (
            <div key={cls.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Class {cls.name}</p>
                  <p className="text-xs text-slate-500">{cls.sections.length} section(s)</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deletingClassId === cls.id}
                  onClick={() => void handleDeleteClass(cls.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {cls.sections.map((sec) => (
                  <span
                    key={sec.id}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {cls.name}-{sec.name}
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-700"
                      disabled={deletingSectionId === sec.id}
                      onClick={() => void handleDeleteSection(sec.id)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {cls.sections.length === 0 && (
                  <span className="text-xs text-slate-400">No sections yet</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={(e) => void handleCreateClass(e)}>
            <DialogHeader>
              <DialogTitle>Add class</DialogTitle>
              <DialogDescription>Example: 8, 9, 10</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <Input
                placeholder="Class name"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                disabled={saving}
              />
              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" disabled={saving} onClick={() => setClassDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={sectionDialogOpen}
        onOpenChange={(open) => {
          setSectionDialogOpen(open);
          if (open && classes[0]) setSectionClassId(classes[0].id);
        }}
      >
        <DialogContent className="max-w-md">
          <form onSubmit={(e) => void handleCreateSection(e)}>
            <DialogHeader>
              <DialogTitle>Add section</DialogTitle>
              <DialogDescription>Example: A, B, C</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={sectionClassId}
                onChange={(e) => setSectionClassId(e.target.value)}
                disabled={saving}
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>Class {c.name}</option>
                ))}
              </select>
              <Input
                placeholder="Section name"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                disabled={saving}
              />
              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" disabled={saving} onClick={() => setSectionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
