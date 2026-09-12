import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@schoolos/api-client";
import { type AttendanceStatus } from "@schoolos/permissions";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { StatusChip } from "../../components/ui/StatusChip";
import { DeniedState, EmptyState, ErrorState, OfflineState } from "../../components/states/Feedback";

type Row = { studentId: string; fullName: string; admissionNumber?: string; status: string | null };
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
  const [state, setState] = useState<
    "loading" | "loaded" | "saving" | "empty" | "error" | "denied" | "offline" | "success"
  >("loading");
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
  }, []);

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
      setState("success");
      setMessage("Attendance saved");
    } catch (e) {
      mapError(e);
    }
  }

  if (state === "success") {
    return (
      <View className="flex-1 px-6 pt-16" style={{ backgroundColor: theme.colors.background }}>
        <AppText variant="title" color={theme.colors.success}>
          Attendance saved
        </AppText>
        <AppText variant="caption" style={{ marginTop: 8 }}>
          {label} · Present {summary.present} · Absent {summary.absent} · Late {summary.late}
        </AppText>
        <AppText style={{ marginTop: 12 }}>வருகை சேமிக்கப்பட்டது</AppText>
        <View className="mt-8">
          <AppButton label="Done" onPress={() => router.back()} />
        </View>
        <View className="mt-3">
          <AppButton label="Mark again" variant="secondary" onPress={() => void load(sectionId ?? undefined)} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background, paddingTop: 56 }}>
      <AppButton label="Back" variant="secondary" onPress={() => router.back()} style={{ marginHorizontal: 16 }} />
      <AppText variant="title" color={theme.colors.primary} style={{ paddingHorizontal: 16, marginTop: 12 }}>
        Attendance · {label}
      </AppText>
      <AppText style={{ paddingHorizontal: 16, marginTop: 4 }}>வருகை</AppText>

      {sections.length > 1 ? (
        <ScrollView horizontal className="mt-3" contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {sections.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => void load(s.id)}
              className="rounded-full px-3 py-2"
              style={{ backgroundColor: s.id === sectionId ? theme.colors.primary : "white" }}
            >
              <AppText variant="caption" color={s.id === sectionId ? "white" : theme.colors.ink}>
                {s.label}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {state === "loading" ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <AppText variant="caption" style={{ marginTop: 8 }}>
            Loading roster…
          </AppText>
        </View>
      ) : null}
      {state === "denied" ? <DeniedState detail={message} /> : null}
      {state === "offline" ? <OfflineState onRetry={() => void load(sectionId ?? undefined)} /> : null}
      {state === "error" ? <ErrorState message={message} onRetry={() => void load(sectionId ?? undefined)} /> : null}
      {state === "empty" ? (
        <View className="p-4">
          <EmptyState title="No records" detail={message || "No students to show."} />
        </View>
      ) : null}

      {(state === "loaded" || state === "saving") && rows.length > 0 ? (
        <>
          <View className="mt-4 px-4">
            <View className="flex-row gap-2">
              <AppText variant="caption" color={theme.colors.success}>
                Present {summary.present}
              </AppText>
              <AppText variant="caption" color={theme.colors.danger}>
                Absent {summary.absent}
              </AppText>
              <AppText variant="caption" color={theme.colors.warning}>
                Late {summary.late}
              </AppText>
            </View>
            <View className="mt-2">
              <AppButton
                label="Mark all Present"
                variant="secondary"
                onPress={() => setRows((prev) => prev.map((r) => ({ ...r, status: "P" })))}
              />
            </View>
          </View>
          {message && state === "loaded" ? (
            <AppText variant="caption" color={theme.colors.danger} style={{ paddingHorizontal: 16, marginTop: 8 }}>
              {message}
            </AppText>
          ) : null}
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
            {rows.map((r) => (
              <View key={r.studentId} className="mb-2 rounded-2xl bg-white p-3">
                <AppText variant="label">{r.fullName}</AppText>
                <AppText variant="caption">{r.admissionNumber}</AppText>
                <View className="mt-2 flex-row gap-2">
                  {(["P", "A", "L", "H"] as AttendanceStatus[]).map((s) => (
                    <StatusChip
                      key={s}
                      status={s}
                      selected={r.status === s}
                      onPress={() =>
                        setRows((prev) =>
                          prev.map((row) => (row.studentId === r.studentId ? { ...row, status: s } : row)),
                        )
                      }
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
          <View
            className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3"
            style={{ backgroundColor: theme.colors.background }}
          >
            <AppButton
              label={state === "saving" ? "Saving…" : "Submit attendance"}
              loading={state === "saving"}
              onPress={() => void save()}
            />
            <AppText style={{ textAlign: "center", marginTop: 6 }}>வருகையை சமர்ப்பி</AppText>
          </View>
        </>
      ) : null}
    </View>
  );
}
