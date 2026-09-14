"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@schoolos/api-client";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
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
import { canManageAcademicYears } from "./academics-policy";

type AcademicYearItem = { id: string; name: string; isActive: boolean };

export function AcademicYearsBoard() {
  const { acl } = useAppBranding();
  const canManage = canManageAcademicYears(acl);

  const [years, setYears] = useState<AcademicYearItem[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [setActive, setSetActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadYears = useCallback(async () => {
    if (!canManage) {
      setState("denied");
      return;
    }
    setState("loading");
    setErrorMessage("");
    try {
      const list = await api().academics.years.list();
      setYears(list);
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
      setErrorMessage(err instanceof Error ? err.message : "Failed to load academic years");
    }
  }, [canManage]);

  useEffect(() => {
    void loadYears();
  }, [loadYears]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Academic year name is required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await api().academics.years.create({ name: name.trim(), isActive: setActive });
      toast.success("Academic year created");
      setDialogOpen(false);
      setName("");
      await loadYears();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create academic year");
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(id: string) {
    setActivatingId(id);
    try {
      await api().academics.years.update(id, { isActive: true });
      toast.success("Academic year activated");
      await loadYears();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to activate academic year");
    } finally {
      setActivatingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this academic year? This is only allowed when no classes exist.")) return;
    setDeletingId(id);
    try {
      await api().academics.years.remove(id);
      toast.success("Academic year deleted");
      await loadYears();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete academic year");
    } finally {
      setDeletingId(null);
    }
  }

  if (state === "denied" || !canManage) {
    return (
      <PermissionDenied detail={errorMessage || "You do not have permission to manage academic years."} />
    );
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} onRetry={() => void loadYears()} />;
  }

  if (state === "offline") {
    return (
      <ErrorState
        message="You appear to be offline. Please check your network connection."
        onRetry={() => void loadYears()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Create and activate academic years for your school.</p>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add year
        </Button>
      </div>

      {state === "loading" ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : state === "empty" ? (
        <EmptyState
          title="No academic years"
          detail="Create your first academic year using the Add year button above."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {years.map((year) => (
              <TableRow key={year.id}>
                <TableCell className="font-medium">{year.name}</TableCell>
                <TableCell>
                  {year.isActive ? (
                    <Badge variant="published">Active</Badge>
                  ) : (
                    <Badge variant="muted">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!year.isActive && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={activatingId === year.id}
                        onClick={() => void handleActivate(year.id)}
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        {activatingId === year.id ? "Activating…" : "Activate"}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === year.id}
                      onClick={() => void handleDelete(year.id)}
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
          <form onSubmit={(e) => void handleCreate(e)}>
            <DialogHeader>
              <DialogTitle>Add academic year</DialogTitle>
              <DialogDescription>Example: 2026-27</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <Input
                placeholder="Year name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={setActive}
                  onChange={(e) => setSetActive(e.target.checked)}
                  disabled={saving}
                />
                Set as active year
              </label>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" disabled={saving} onClick={() => setDialogOpen(false)}>
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
