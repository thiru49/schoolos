import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS, type AttendanceStatus } from "@schoolos/permissions";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { StatusChip } from "../../components/ui/StatusChip";
import { DeniedState, EmptyState, ErrorState, OfflineState } from "../../components/states/Feedback";

type Row = { studentId: string; fullName: string; admissionNumber?: string; date?: string; status: string | null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceScreen() {
  const { theme, acl, selectedChild } = useBranding();
  const router = useRouter();
  const canMark = acl?.permissions.includes(PERMISSIONS.ATTENDANCE_MARK);
  const isParent = acl?.roles.includes("parent");
  const isStudent = acl?.roles.includes("student");
  const [rows, setRows] = useState<Row[]>([]);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [state, setState] = useState<"loading" | "loaded" | "saving" | "empty" | "error" | "denied" | "offline">(
    "loading",
  );
  const [message, setMessage] = useState("");

  const summary = useMemo(
    () => ({
      present: rows.filter((r) => r.status === "P").length,
      absent: rows.filter((r) => r.status === "A").length,
      late: rows.filter((r) => r.status === "L").length,
    }),
    [rows],
  );

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
    setMessage(e instanceof Error ? e.message : "Failed to load");
  }

  const load = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const client = await api();
      if (isParent) {
        const child = selectedChild ?? (await client.me.children())[0];
        if (!child) {
          setState("empty");
          setMessage("No linked children — contact school office");
          return;
        }
        setLabel(child.fullName);
        const data = await client.attendanceApi.list({ studentId: child.studentId });
        setRows(data.records);
        setState(data.records.length === 0 ? "empty" : "loaded");
        return;
      }
      if (isStudent) {
        const self = acl?.scopes.find((s) => s.type === "self")?.studentId;
        if (!self) {
          setState("denied");
          setMessage("No student scope");
          return;
        }
        const data = await client.attendanceApi.list({ studentId: self });
        setRows(data.records);
        setLabel("My attendance");
        setState(data.records.length === 0 ? "empty" : "loaded");
        return;
      }
      const sections = await client.academics.sections();
      const first = sections[0];
      if (!first) {
        setState("empty");
        setMessage("No classes in scope");
        return;
      }
      setSectionId(first.id);
      setLabel(first.label);
      const roster = await client.attendanceApi.roster(first.id, today());
      setRows(roster.rows);
      setState(roster.rows.length === 0 ? "empty" : "loaded");
    } catch (e) {
      mapError(e);
    }
  }, [acl, isParent, isStudent, selectedChild]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!sectionId) return;
    const marks = rows
      .filter((r) => r.status)
      .map((r) => ({ studentId: r.studentId, status: r.status as AttendanceStatus }));
    if (marks.length === 0) {
      setMessage("Mark at least one student");
      return;
    }
    setState("saving");
    try {
      await (await api()).attendanceApi.mark({ sectionId, date: today(), marks });
      setState("loaded");
      setMessage("Attendance saved");
    } catch (e) {
      mapError(e);
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background, paddingTop: 56 }}>
      <AppButton label="Back" variant="secondary" onPress={() => router.back()} style={{ marginHorizontal: 16 }} />
      <AppText variant="title" color={theme.colors.primary} style={{ paddingHorizontal: 16, marginTop: 12 }}>
        Attendance · {label}
      </AppText>

      {state === "loading" ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <AppText variant="caption" style={{ marginTop: 8 }}>
            Loading roster…
          </AppText>
        </View>
      ) : null}
      {state === "denied" ? <DeniedState detail={message} /> : null}
      {state === "offline" ? <OfflineState onRetry={() => void load()} /> : null}
      {state === "error" ? <ErrorState message={message} onRetry={() => void load()} /> : null}
      {state === "empty" ? <View className="p-4"><EmptyState title="No records" detail={message || "No students to show."} /></View> : null}

      {(state === "loaded" || state === "saving") && rows.length > 0 ? (
        <>
          {canMark ? (
            <View className="mt-4 px-4">
              <View className="flex-row gap-2">
                <AppText variant="caption" color={theme.colors.success}>Present {summary.present}</AppText>
                <AppText variant="caption" color={theme.colors.danger}>Absent {summary.absent}</AppText>
                <AppText variant="caption" color={theme.colors.warning}>Late {summary.late}</AppText>
              </View>
              <View className="mt-2">
                <AppButton
                  label="Mark all Present"
                  variant="secondary"
                  onPress={() => setRows((prev) => prev.map((r) => ({ ...r, status: "P" })))}
                />
              </View>
            </View>
          ) : null}
          {message && state === "loaded" ? (
            <AppText variant="caption" color={theme.colors.success} style={{ paddingHorizontal: 16, marginTop: 8 }}>
              {message}
            </AppText>
          ) : null}
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
            {rows.map((r, idx) => (
              <View key={`${r.studentId}-${r.date ?? idx}`} className="mb-2 rounded-2xl bg-white p-3">
                <AppText variant="label">{r.fullName}</AppText>
                <AppText variant="caption">{r.date ?? r.admissionNumber}</AppText>
                {canMark ? (
                  <View className="mt-2 flex-row gap-2">
                    {(["P", "A", "L", "H"] as AttendanceStatus[]).map((s) => (
                      <StatusChip
                        key={s}
                        status={s}
                        selected={r.status === s}
                        onPress={() =>
                          setRows((prev) => prev.map((row) => (row.studentId === r.studentId ? { ...row, status: s } : row)))
                        }
                      />
                    ))}
                  </View>
                ) : (
                  <AppText style={{ marginTop: 8 }}>{r.status ?? "Not marked"}</AppText>
                )}
              </View>
            ))}
          </ScrollView>
          {canMark ? (
            <View className="absolute bottom-6 left-4 right-4">
              <AppButton label={state === "saving" ? "Saving…" : "Submit attendance"} loading={state === "saving"} onPress={() => void save()} />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
