"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@schoolos/api-client";
import { canReadEvents, canWriteEvents } from "./communications-policy";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  MapPin,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { Select } from "../../components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui/table";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import { EventDialog } from "./event-dialog";
import type { EventItem } from "./communications-types";

function formatDateRange(startIso: string, endIso: string) {
  const start = new Date(startIso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const end = new Date(endIso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return start === end ? start : `${start} – ${end}`;
}

export function EventsBoard() {
  const { acl } = useAppBranding();
  const canRead = canReadEvents(acl);
  const canWrite = canWriteEvents(acl);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!canRead) {
      setState("denied");
      return;
    }
    setState("loading");
    setErrorMessage("");
    try {
      const query: { from?: string; to?: string } = {};
      if (fromDate) query.from = fromDate;
      if (toDate) query.to = toDate;

      const list = await api().events.list(Object.keys(query).length > 0 ? query : undefined);
      setEvents(list);
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
      setErrorMessage(err instanceof Error ? err.message : "Failed to load events");
    }
  }, [canRead, fromDate, toDate]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (statusFilter === "published" && !e.published) return false;
      if (statusFilter === "draft" && e.published) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.location && e.location.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [events, statusFilter, search]);

  async function handleSaveEvent(data: {
    title: string;
    description?: string | null;
    startDate: string;
    endDate: string;
    location?: string | null;
    published?: boolean;
  }) {
    if (editingEvent) {
      await api().events.update(editingEvent.id, data);
      toast.success("Event updated");
    } else {
      await api().events.create(data);
      toast.success(data.published ? "Event published" : "Draft event saved");
    }
    await loadEvents();
  }

  async function handleTogglePublish(item: EventItem) {
    try {
      const newStatus = !item.published;
      await api().events.update(item.id, { published: newStatus });
      toast.success(newStatus ? "Event published" : "Event unpublished (saved as draft)");
      await loadEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update event status");
    }
  }

  async function handleDeleteEvent(id: string) {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    setDeletingId(id);
    try {
      await api().events.remove(id);
      toast.success("Event deleted");
      await loadEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete event");
    } finally {
      setDeletingId(null);
    }
  }

  if (state === "denied" || !canRead) {
    return <PermissionDenied detail={errorMessage || "You do not have permission to view events."} />;
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} onRetry={() => void loadEvents()} />;
  }

  if (state === "offline") {
    return <ErrorState message="You appear to be offline. Please check your network connection." onRetry={() => void loadEvents()} />;
  }

  return (
    <div className="space-y-5">
      {/* Top Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "published" | "draft")}
            className="h-10 w-auto text-xs"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </Select>

          {/* Date range inputs */}
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              placeholder="From"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 text-xs w-36"
            />
            <span className="text-xs text-slate-400">to</span>
            <Input
              type="date"
              placeholder="To"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 text-xs w-36"
            />
            {fromDate || toDate ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 text-xs"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        {/* Action Button */}
        {canWrite ? (
          <Button
            variant="primary"
            onClick={() => {
              setEditingEvent(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Event
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
      ) : events.length === 0 ? (
        <EmptyState
          title="No events found"
          detail={
            canWrite
              ? "Schedule your first school event or calendar activity using the New Event button above."
              : "No upcoming school events have been scheduled."
          }
        />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="No matching events"
          detail="No events match the selected search or date range filters."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-display text-base font-semibold text-slate-800">
              School Events Calendar
            </h3>
            <p className="text-xs text-slate-400">
              {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"} listed
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                {canWrite ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-xs">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    {item.description ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                        {item.description}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{formatDateRange(item.startDate, item.endDate)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-slate-600">
                    {item.location ? (
                      <div className="flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" />
                        <span>{item.location}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {item.published ? (
                      <Badge variant="published">Published</Badge>
                    ) : (
                      <Badge variant="muted">Draft</Badge>
                    )}
                  </TableCell>
                  {canWrite ? (
                    <TableCell className="whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => void handleTogglePublish(item)}
                        >
                          {item.published ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-600 hover:text-primary"
                          onClick={() => {
                            setEditingEvent(item);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-600 hover:text-danger"
                          disabled={deletingId === item.id}
                          onClick={() => void handleDeleteEvent(item.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <EventDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        initialData={editingEvent}
        isEditing={Boolean(editingEvent)}
      />
    </div>
  );
}
