import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@schoolos/api-client";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { ChildSwitcher } from "../parent/child-switcher";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { DeniedState, EmptyState, ErrorState, OfflineState } from "../../components/states/Feedback";

type Row = { studentId: string; fullName: string; date: string; status: string | null };

const LABELS: Record<string, string> = { P: "Present", A: "Absent", L: "Late", H: "Holiday" };
const TAMIL: Record<string, string> = { P: "வந்தார்", A: "வரவில்லை", L: "தாமதம்", H: "விடுமுறை" };
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthRange(year: number, month: number) {
  const last = new Date(year, month + 1, 0).getDate();
  return {
    from: `${year}-${pad(month + 1)}-01`,
    to: `${year}-${pad(month + 1)}-${pad(last)}`,
    last,
  };
}

export function ParentHistory({ mode }: { mode: "parent" | "student" }) {
  const { theme, acl, selectedChild } = useBranding();
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rows, setRows] = useState<Row[]>([]);
  const [label, setLabel] = useState("");
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");

  const range = useMemo(() => monthRange(year, month), [year, month]);
  const byDate = useMemo(() => new Map(rows.map((r) => [r.date, r.status])), [rows]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const client = await api();
      let studentId: string | undefined;
      if (mode === "parent") {
        const child = selectedChild ?? (await client.me.children())[0];
        if (!child) {
          setState("empty");
          setMessage("No linked children — contact school office");
          return;
        }
        studentId = child.studentId;
        setLabel(child.fullName);
      } else {
        studentId = acl?.scopes.find((s) => s.type === "self")?.studentId;
        if (!studentId) {
          setState("denied");
          setMessage("No student scope");
          return;
        }
        setLabel("My attendance");
      }
      const data = await client.attendanceApi.list({
        studentId,
        from: range.from,
        to: range.to,
      });
      setRows(data.records);
      setState(data.records.length === 0 ? "empty" : "loaded");
    } catch (e) {
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
  }, [acl, mode, range.from, range.to, selectedChild]);

  useEffect(() => {
    void load();
  }, [load]);

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setSelectedDay(null);
  }

  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: range.last }, (_, i) => i + 1)];

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background, paddingTop: 56 }}>
      <AppButton label="Back" variant="secondary" onPress={() => router.back()} style={{ marginHorizontal: 16 }} />
      <AppText variant="title" color={theme.colors.primary} style={{ paddingHorizontal: 16, marginTop: 12 }}>
        Attendance · {label}
      </AppText>
      <AppText style={{ paddingHorizontal: 16, marginTop: 4 }}>வருகை வரலாறு</AppText>
      {mode === "parent" ? (
        <View className="mt-3 px-4">
          <ChildSwitcher />
        </View>
      ) : null}

      <View className="mt-4 flex-row items-center justify-between px-4">
        <AppButton label="Prev" variant="secondary" onPress={() => shiftMonth(-1)} />
        <AppText variant="label">
          {new Date(year, month, 1).toLocaleString("en", { month: "long", year: "numeric" })}
        </AppText>
        <AppButton label="Next" variant="secondary" onPress={() => shiftMonth(1)} />
      </View>

      {state === "loading" ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : null}
      {state === "denied" ? <DeniedState title="You cannot view this attendance" detail={message} /> : null}
      {state === "offline" ? <OfflineState onRetry={() => void load()} /> : null}
      {state === "error" ? <ErrorState message={message} onRetry={() => void load()} /> : null}

      {state === "loaded" || state === "empty" ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View className="rounded-2xl bg-white p-3">
            <View className="flex-row">
              {WEEKDAYS.map((d, i) => (
                <View key={`${d}-${i}`} className="flex-1 items-center py-1">
                  <AppText variant="caption">{d}</AppText>
                </View>
              ))}
            </View>
            {Array.from({ length: Math.ceil(cells.length / 7) }, (_, week) => (
              <View key={week} className="flex-row">
                {cells.slice(week * 7, week * 7 + 7).map((day, i) => {
                  const iso = day ? `${year}-${pad(month + 1)}-${pad(day)}` : "";
                  const status = iso ? byDate.get(iso) : null;
                  const color =
                    status === "P"
                      ? theme.colors.success
                      : status === "A"
                        ? theme.colors.danger
                        : status === "L"
                          ? theme.colors.warning
                          : theme.colors.ink;
                  return (
                    <Pressable
                      key={`${week}-${i}`}
                      className="flex-1 items-center py-2"
                      onPress={() => day && setSelectedDay(iso)}
                    >
                      <AppText
                        variant="caption"
                        color={iso === selectedDay ? theme.colors.primary : status ? color : undefined}
                      >
                        {day ?? ""}
                      </AppText>
                      {status ? (
                        <AppText variant="caption" color={color}>
                          {status}
                        </AppText>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {state === "empty" ? (
            <View className="mt-4">
              <EmptyState title="No records this month" detail={message || "Attendance for this month has not been marked yet."} />
            </View>
          ) : (
            <View className="mt-4">
              {(selectedDay ? rows.filter((r) => r.date === selectedDay) : rows).map((r) => (
                <View key={`${r.studentId}-${r.date}`} className="mb-2 rounded-2xl bg-white p-3">
                  <AppText variant="label">{r.date}</AppText>
                  <AppText variant="caption">
                    {LABELS[r.status ?? ""] ?? r.status ?? "Not marked"}
                  </AppText>
                  {r.status ? <AppText>{TAMIL[r.status]}</AppText> : null}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}
