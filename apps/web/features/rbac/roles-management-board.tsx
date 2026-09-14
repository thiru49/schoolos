"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { RoleSummary, UserRoleDetail, AclScope } from "@schoolos/types";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import {
  canAssignRoles,
  canGrantRole,
  checkRolesRouteAccess,
} from "./roles-policy";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

interface SectionOption {
  id: string;
  name: string;
  classId: string;
  className: string;
  label: string;
}

export function RolesManagementBoard() {
  const { acl } = useAppBranding();
  const [users, setUsers] = useState<UserRoleDetail[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Role Assignment Dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<UserRoleDetail | null>(null);
  const [selectedRoleCodes, setSelectedRoleCodes] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  // Scope Management Dialog
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [selectedUserForScopes, setSelectedUserForScopes] = useState<UserRoleDetail | null>(null);
  const [editingScopes, setEditingScopes] = useState<AclScope[]>([]);
  const [newScopeType, setNewScopeType] = useState<string>("school");
  const [newClassId, setNewClassId] = useState<string>("");
  const [newSectionId, setNewSectionId] = useState<string>("");
  const [savingScopes, setSavingScopes] = useState(false);

  const routeAccess = useMemo(() => checkRolesRouteAccess("/roles", acl), [acl]);

  const loadData = async () => {
    if (!canAssignRoles(acl)) return;
    setLoading(true);
    setError(null);
    try {
      const client = api();
      const [allRoles, allUsers, allSections] = await Promise.all([
        client.roles.list(),
        client.roles.listUsers(),
        client.academics.sections().catch(() => [] as SectionOption[]),
      ]);
      setRoles(allRoles);
      setUsers(allUsers);
      setSections(allSections);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load role assignment data";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [acl]);

  // Derived unique classes from sections
  const classes = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sections) {
      if (!map.has(s.classId)) {
        map.set(s.classId, s.className);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sections]);

  // Available sections filtered by selected class
  const filteredSectionsForNewScope = useMemo(() => {
    if (!newClassId) return sections;
    return sections.filter((s) => s.classId === newClassId);
  }, [sections, newClassId]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !searchTerm.trim() ||
        u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.identifier.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole =
        roleFilter === "ALL" || u.roles.some((r) => r.code === roleFilter);

      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  if (!routeAccess.allowed) {
    return (
      <div className="mx-auto max-w-2xl mt-12">
        <Card className="p-8 border-red-200 bg-red-50/50 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">Access Denied</h2>
          <p className="mt-2 text-sm text-slate-600">
            {routeAccess.reason ?? "You do not have permission to view or manage role assignments."}
          </p>
        </Card>
      </div>
    );
  }

  const openRoleDialog = (user: UserRoleDetail) => {
    setSelectedUserForRoles(user);
    setSelectedRoleCodes(user.roles.map((r) => r.code));
    setRoleDialogOpen(true);
  };

  const handleToggleRole = (code: string) => {
    if (selectedRoleCodes.includes(code)) {
      setSelectedRoleCodes(selectedRoleCodes.filter((c) => c !== code));
    } else {
      setSelectedRoleCodes([...selectedRoleCodes, code]);
    }
  };

  const handleSaveRoles = async () => {
    if (!selectedUserForRoles) return;
    if (selectedRoleCodes.length === 0) {
      toast.error("User must have at least one assigned role");
      return;
    }
    setSavingRoles(true);
    try {
      const updated = await api().roles.assignRoles(selectedUserForRoles.id, selectedRoleCodes);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(`Roles updated for ${selectedUserForRoles.displayName}`);
      setRoleDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to assign roles";
      toast.error(msg);
    } finally {
      setSavingRoles(false);
    }
  };

  const openScopeDialog = (user: UserRoleDetail) => {
    setSelectedUserForScopes(user);
    setEditingScopes([...user.scopes]);
    setNewScopeType("school");
    setNewClassId("");
    setNewSectionId("");
    setScopeDialogOpen(true);
  };

  const handleAddScope = () => {
    if (newScopeType === "class" && !newClassId) {
      toast.error("Please select a class for class-level scope");
      return;
    }
    if (newScopeType === "section" && (!newClassId || !newSectionId)) {
      toast.error("Please select both a class and section for section-level scope");
      return;
    }

    const newScope: AclScope = {
      type: newScopeType as AclScope["type"],
      classId: newScopeType === "class" || newScopeType === "section" ? newClassId : undefined,
      sectionId: newScopeType === "section" ? newSectionId : undefined,
    };

    // Check for duplicate
    const exists = editingScopes.some(
      (s) =>
        s.type === newScope.type &&
        s.classId === newScope.classId &&
        s.sectionId === newScope.sectionId,
    );
    if (exists) {
      toast.error("This scope is already added");
      return;
    }

    setEditingScopes([...editingScopes, newScope]);
    setNewClassId("");
    setNewSectionId("");
  };

  const handleRemoveScope = (index: number) => {
    setEditingScopes(editingScopes.filter((_, i) => i !== index));
  };

  const handleSaveScopes = async () => {
    if (!selectedUserForScopes) return;
    setSavingScopes(true);
    try {
      const updated = await api().roles.updateScopes(
        selectedUserForScopes.id,
        editingScopes.map((s) => ({
          scopeType: s.type,
          classId: s.classId ?? null,
          sectionId: s.sectionId ?? null,
          subjectId: s.subjectId ?? null,
          studentId: s.studentId ?? null,
        })),
      );
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(`Scopes updated for ${selectedUserForScopes.displayName}`);
      setScopeDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update scopes";
      toast.error(msg);
    } finally {
      setSavingScopes(false);
    }
  };

  const formatScopeBadge = (scope: AclScope) => {
    switch (scope.type) {
      case "school":
        return <Badge className="bg-sky-50 text-sky-800 border-sky-200">School-wide</Badge>;
      case "class": {
        const cName = classes.find((c) => c.id === scope.classId)?.name ?? "Class";
        return <Badge className="bg-indigo-50 text-indigo-800 border-indigo-200">Class {cName}</Badge>;
      }
      case "section": {
        const sec = sections.find((s) => s.id === scope.sectionId);
        const label = sec ? `${sec.className}-${sec.name}` : "Section";
        return <Badge className="bg-purple-50 text-purple-800 border-purple-200">Sec {label}</Badge>;
      }
      case "self":
        return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">Self Only</Badge>;
      case "children":
        return <Badge className="bg-amber-50 text-amber-800 border-amber-200">Linked Children</Badge>;
      case "subject":
        return <Badge className="bg-blue-50 text-blue-800 border-blue-200">Subject</Badge>;
      default:
        return <Badge>{scope.type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search user name or login ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-48"
              >
                <option value="ALL">All Roles ({users.length})</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadData()}
            disabled={loading}
            className="flex items-center gap-2 self-start md:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="flex-1">{error}</p>
          <Button size="sm" variant="secondary" onClick={() => void loadData()}>
            Retry
          </Button>
        </div>
      )}

      {/* Users Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-slate-800">No users found</h3>
            <p className="mt-1 text-sm text-slate-500">
              {searchTerm || roleFilter !== "ALL"
                ? "Try adjusting your search or filter parameters."
                : "No users exist in this school directory."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Login ID</TableHead>
                <TableHead>Assigned Roles</TableHead>
                <TableHead>Resource Scopes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium text-slate-900">{user.displayName}</div>
                    <div className="text-xs text-slate-500">{user.isActive ? "Active" : "Inactive"}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                      {user.identifier}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {user.roles.map((r) => (
                        <Badge
                          key={r.id}
                          className="bg-slate-100 text-slate-800 border-slate-200"
                        >
                          {r.name}
                        </Badge>
                      ))}
                      {user.roles.length === 0 && (
                        <span className="text-xs text-slate-400 italic">No roles assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {user.scopes.map((s, idx) => (
                        <span key={idx}>{formatScopeBadge(s)}</span>
                      ))}
                      {user.scopes.length === 0 && (
                        <span className="text-xs text-slate-400 italic">No scopes</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openRoleDialog(user)}
                      className="text-xs"
                    >
                      <Shield className="mr-1.5 h-3.5 w-3.5 text-primary" />
                      Roles
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openScopeDialog(user)}
                      className="text-xs"
                    >
                      <Filter className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                      Scopes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Role Assignment Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div>
              <DialogTitle>Assign Roles</DialogTitle>
              <DialogDescription>
                Select roles for <span className="font-semibold text-slate-800">{selectedUserForRoles?.displayName}</span> ({selectedUserForRoles?.identifier})
              </DialogDescription>
            </div>
            <DialogClose onClick={() => setRoleDialogOpen(false)} />
          </DialogHeader>

          <div className="space-y-3 py-3">
            <p className="text-xs text-slate-500">
              Only roles with permissions within your administrative authorization may be granted.
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {roles.map((role) => {
                const grantable = canGrantRole(acl, {
                  code: role.code,
                  permissions: role.permissions,
                });
                const isSelected = selectedRoleCodes.includes(role.code);

                return (
                  <label
                    key={role.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                      !grantable
                        ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                        : isSelected
                        ? "border-primary/50 bg-primary/5 cursor-pointer"
                        : "border-slate-200 hover:bg-slate-50 cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!grantable}
                      checked={isSelected}
                      onChange={() => handleToggleRole(role.code)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{role.name}</span>
                        {!grantable && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Beyond your authority
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Code: <code className="text-slate-700 font-mono">{role.code}</code> · {role.permissions.length} permissions
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveRoles()} disabled={savingRoles}>
              {savingRoles ? "Saving..." : "Save Roles"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scope Management Dialog */}
      <Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div>
              <DialogTitle>Manage Resource Scopes</DialogTitle>
              <DialogDescription>
                Define operational boundaries for <span className="font-semibold text-slate-800">{selectedUserForScopes?.displayName}</span>
              </DialogDescription>
            </div>
            <DialogClose onClick={() => setScopeDialogOpen(false)} />
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Current Scopes List */}
            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wide">Current Scopes</Label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                {editingScopes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No resource scopes assigned.</p>
                ) : (
                  editingScopes.map((scope, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {formatScopeBadge(scope)}
                        <span className="text-xs text-slate-600 font-mono">
                          {scope.classId && `classId: ${scope.classId.slice(0, 8)}... `}
                          {scope.sectionId && `secId: ${scope.sectionId.slice(0, 8)}...`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveScope(idx)}
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                        title="Remove scope"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add New Scope Section */}
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/30 space-y-3">
              <Label className="text-xs font-semibold text-slate-700">Add New Scope</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Scope Type</label>
                  <Select
                    value={newScopeType}
                    onChange={(e) => {
                      setNewScopeType(e.target.value);
                      setNewClassId("");
                      setNewSectionId("");
                    }}
                  >
                    <option value="school">School-wide</option>
                    <option value="class">Class</option>
                    <option value="section">Section</option>
                    <option value="self">Self (Student)</option>
                    <option value="children">Children (Parent)</option>
                  </Select>
                </div>

                {(newScopeType === "class" || newScopeType === "section") && (
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Class</label>
                    <Select
                      value={newClassId}
                      onChange={(e) => {
                        setNewClassId(e.target.value);
                        setNewSectionId("");
                      }}
                    >
                      <option value="">Select Class...</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          Class {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {newScopeType === "section" && (
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-500 mb-1 block">Section</label>
                    <Select
                      value={newSectionId}
                      onChange={(e) => setNewSectionId(e.target.value)}
                      disabled={!newClassId}
                    >
                      <option value="">Select Section...</option>
                      {filteredSectionsForNewScope.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.className} - {s.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddScope}
                className="w-full flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add to List
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setScopeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveScopes()} disabled={savingScopes}>
              {savingScopes ? "Saving..." : "Save Scopes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
