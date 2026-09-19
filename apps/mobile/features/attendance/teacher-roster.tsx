import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Search, CheckCircle2 } from "lucide-react-native";
import { ApiError } from "@schoolos/api-client";
import { type AttendanceStatus } from "@schoolos/permissions";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import {
  Screen,
  ScreenHeader,
  Card,
  Avatar,
  Badge,
  AppButton,
  AppInput,
  StatusChip,
  StickyActionBar,
} from "../../components/ui";
import { AppText } from "../../components/ui/AppText";
import {
  DeniedState,
  EmptyState,
  ErrorState,
  OfflineState,
} from "../../components/states/Feedback";

type Row = {
  studentId: string;
  fullName: string;
  admissionNumber?: string;
  status: string | null;
};
type Section = { id: string; label: string };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function TeacherRoster() {
  const { theme } = useBranding();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [state, setState] = useState<
    "loading" | "loaded" | "saving" | "empty" | "error" | "denied" | "offline" | "success"
  >("loading");
  const [message, setMessage] = useState("");
  /** True when the roster already had saved marks from the server. */
  const [hasExistingMarks, setHasExistingMarks] = useState(false);
  /** True after the teacher changes any student status locally. */
  const [isDirty, setIsDirty] = useState(false);

  const summary = useMemo(
    () => ({
      present: rows.filter((r) => r.status === "P").length,
      absent: rows.filter((r) => r.status === "A").length,
      late: rows.filter((r) => r.status === "L").length,
      unmarked: rows.filter((r) => !r.status).length,
      total: rows.length,
    }),
    [rows],
  );

  const actionLabel = hasExistingMarks ? "Update Attendance" : "Mark Attendance";
  const canSave =
    state === "loaded" &&
    rows.some((r) => r.status) &&
    (!hasExistingMarks || isDirty);

  function mapError(e: unknown) {
    if (e instanceof ApiError && e.status === 403) {
      setState("denied");
      setMessage(e.message);
      return;
    }
    if (e instanceof TypeError) {
      setState("offline");
      setMessage("You appear to be offline.");
      return;
    }
    setState("error");
    setMessage(e instanceof Error ? e.message : "Failed to load roster");
  }

  const load = useCallback(async (nextSectionId?: string) => {
    setState("loading");
    setMessage("");
    try {
      const client = await api();
      const list = await client.academics.sections();
      setSections(list);
      const first = list.find((s) => s.id === nextSectionId) ?? list[0];
      if (!first) {
        setState("empty");
        setMessage("No assigned class sections in your scope.");
        return;
      }
      setSectionId(first.id);
      setLabel(first.label);
      const roster = await client.attendanceApi.roster(first.id, today());
      setRows(roster.rows);
      setHasExistingMarks(roster.rows.some((r) => Boolean(r.status)));
      setIsDirty(false);
      setState(roster.rows.length === 0 ? "empty" : "loaded");
    } catch (e) {
      mapError(e);
    }
  }, []);

  function setStudentStatus(studentId: string, status: AttendanceStatus) {
    setRows((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, status } : row)),
    );
    setIsDirty(true);
    if (message) setMessage("");
  }

  function markAllPresent() {
    setRows((prev) => prev.map((r) => ({ ...r, status: "P" })));
    setIsDirty(true);
    if (message) setMessage("");
  }

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!sectionId || !canSave) return;
    const marks = rows
      .filter((r) => r.status)
      .map((r) => ({ studentId: r.studentId, status: r.status as AttendanceStatus }));
    if (marks.length === 0) {
      setMessage("Please mark at least one student before saving.");
      return;
    }
    setState("saving");
    const wasUpdate = hasExistingMarks;
    try {
      await (await api()).attendanceApi.mark({ sectionId, date: today(), marks });
      setHasExistingMarks(true);
      setIsDirty(false);
      setMessage(wasUpdate ? "Attendance updated successfully" : "Attendance saved successfully");
      setState("success");
    } catch (e) {
      mapError(e);
    }
  }

  // Filtered rows based on search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.admissionNumber && r.admissionNumber.toLowerCase().includes(q)),
    );
  }, [rows, searchQuery]);

  // Success State
  if (state === "success") {
    return (
      <Screen scrollable={true}>
        <ScreenHeader title="Attendance" subtitle="வருகைப் பதிவு" showBack />
        <View className="px-6 pt-6 items-center">
          <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
            <CheckCircle2 size={36} color="#059669" />
          </View>

          <AppText
            variant="display"
            color={theme.colors.primary}
            style={{ fontSize: 24, fontWeight: "800", textAlign: "center" }}
          >
            {message.includes("updated") ? "Attendance Updated!" : "Attendance Saved!"}
          </AppText>
          <AppText variant="body" style={{ color: "#64748B", marginTop: 4, textAlign: "center" }}>
            Class {label} • வருகை சேமிக்கப்பட்டது
          </AppText>

          <Card variant="elevated" style={{ width: "100%", marginTop: 24, marginBottom: 24 }}>
            <View className="flex-row justify-around py-2">
              <View className="items-center">
                <AppText variant="title" style={{ fontSize: 22, fontWeight: "800", color: "#059669" }}>
                  {summary.present}
                </AppText>
                <AppText variant="caption" style={{ color: "#64748B" }}>
                  Present
                </AppText>
              </View>

              <View className="w-[1px] bg-slate-200" />

              <View className="items-center">
                <AppText variant="title" style={{ fontSize: 22, fontWeight: "800", color: "#DC2626" }}>
                  {summary.absent}
                </AppText>
                <AppText variant="caption" style={{ color: "#64748B" }}>
                  Absent
                </AppText>
              </View>

              <View className="w-[1px] bg-slate-200" />

              <View className="items-center">
                <AppText variant="title" style={{ fontSize: 22, fontWeight: "800", color: "#D97706" }}>
                  {summary.late}
                </AppText>
                <AppText variant="caption" style={{ color: "#64748B" }}>
                  Late
                </AppText>
              </View>
            </View>
          </Card>

          <View className="w-full gap-y-3">
            <AppButton
              label="Return to Dashboard"
              variant="primary"
              onPress={() => router.back()}
            />
            <AppButton
              label="Update Attendance"
              variant="outline"
              onPress={() => void load(sectionId ?? undefined)}
            />
          </View>
        </View>
      </Screen>
    );
  }

  if (state === "denied" || state === "offline" || state === "error") {
    return (
      <Screen scrollable={true}>
        <ScreenHeader title="Attendance" subtitle="வருகைப் பதிவு" showBack />
        <View className="px-6 pt-4">
          {state === "denied" ? <DeniedState detail={message} /> : null}
          {state === "offline" ? <OfflineState onRetry={() => void load(sectionId ?? undefined)} /> : null}
          {state === "error" ? <ErrorState message={message} onRetry={() => void load(sectionId ?? undefined)} /> : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <View className="pb-2">
        <ScreenHeader
          title="Attendance"
          subtitle={`Class ${label || "—"} • வருகைப் பதிவு`}
          showBack
        />
        <View className="px-6">

        {/* Section Selector if teacher teaches multiple sections */}
        {sections.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
          >
            {sections.map((s) => {
              const isSelected = s.id === sectionId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => void load(s.id)}
                  className="px-4 py-2 rounded-xl border active:opacity-80"
                  style={{
                    backgroundColor: isSelected ? theme.colors.primary : "#FFFFFF",
                    borderColor: isSelected ? theme.colors.primary : "#CBD5E1",
                  }}
                >
                  <AppText
                    variant="caption"
                    style={{
                      fontWeight: "700",
                      color: isSelected ? "#FFFFFF" : "#334155",
                    }}
                  >
                    Section {s.label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Attendance Metric Summary Bar */}
        <Card variant="default" style={{ marginBottom: 12, paddingVertical: 10, paddingHorizontal: 14 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-x-2">
              <Badge label={`P: ${summary.present}`} variant="success" />
              <Badge label={`A: ${summary.absent}`} variant="danger" />
              <Badge label={`L: ${summary.late}`} variant="warning" />
            </View>

            <AppButton
              label="Mark All P"
              variant="secondary"
              size="sm"
              onPress={markAllPresent}
            />
          </View>
        </Card>

        {/* Search Student Input */}
        <View className="mb-2">
          <AppInput
            placeholder="Search student name or admission no…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Search size={16} color="#94A3B8" />}
          />
        </View>

        {message && state === "loaded" ? (
          <View className="p-2 mb-2 bg-red-50 border border-red-200 rounded-xl">
            <AppText variant="caption" color={theme.colors.danger} style={{ fontWeight: "600" }}>
              {message}
            </AppText>
          </View>
        ) : null}

        {hasExistingMarks && state === "loaded" ? (
          <View className="p-2 mb-2 bg-sky-50 border border-sky-200 rounded-xl">
            <AppText variant="caption" style={{ color: "#0369A1", fontWeight: "600" }}>
              {isDirty
                ? "Changes pending — tap Update Attendance to save."
                : "Attendance already marked for today. Change any student status to enable Update."}
            </AppText>
          </View>
        ) : null}
        </View>
      </View>

      {/* States */}
      {state === "loading" ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText variant="caption" style={{ marginTop: 12, color: "#64748B" }}>
            Loading student roster…
          </AppText>
        </View>
      ) : null}

      {state === "empty" ? (
        <View className="p-6">
          <EmptyState title="No students found" detail={message || "No students assigned to this section."} />
        </View>
      ) : null}

      {/* Student List */}
      {(state === "loaded" || state === "saving") && filteredRows.length > 0 ? (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 110 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-y-2.5">
            {filteredRows.map((r, idx) => (
              <Card key={r.studentId} variant="default" style={{ padding: 12 }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-x-3 flex-1 pr-2">
                    <Avatar name={r.fullName} size="sm" />
                    <View className="flex-1">
                      <AppText variant="title" style={{ fontSize: 15, fontWeight: "700" }}>
                        {r.fullName}
                      </AppText>
                      <AppText variant="caption" style={{ color: "#64748B", fontSize: 12 }}>
                        {r.admissionNumber ? `ID: ${r.admissionNumber}` : `Roll #${idx + 1}`}
                      </AppText>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-x-1.5">
                    {(["P", "A", "L", "H"] as AttendanceStatus[]).map((statusKey) => {
                      const isSelected = r.status === statusKey;
                      return (
                        <StatusChip
                          key={statusKey}
                          status={statusKey}
                          compact={true}
                          selected={isSelected}
                          onPress={() => setStudentStatus(r.studentId, statusKey)}
                        />
                      );
                    })}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {/* Sticky Bottom Bar */}
      {(state === "loaded" || state === "saving") && rows.length > 0 ? (
        <StickyActionBar>
          <AppButton
            label={
              state === "saving"
                ? hasExistingMarks
                  ? "Updating Attendance…"
                  : "Saving Attendance…"
                : `${actionLabel} (${summary.present}/${summary.total} P)`
            }
            loading={state === "saving"}
            disabled={!canSave && state !== "saving"}
            variant="primary"
            onPress={() => void save()}
          />
        </StickyActionBar>
      ) : null}
    </Screen>
  );
}
