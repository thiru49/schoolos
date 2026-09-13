import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@schoolos/api-client";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { DeniedState, EmptyState, ErrorState, OfflineState } from "../../components/states/Feedback";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Period = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
};

export function TimetableScreen() {
  const { theme, acl, selectedChild } = useBranding();
  const router = useRouter();
  const isParent = acl?.roles.includes("parent");
  const [weekday, setWeekday] = useState(1);
  const [rows, setRows] = useState<Period[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const query =
        isParent && selectedChild ? { studentId: selectedChild.studentId, weekday } : { weekday };
      const list = await (await api()).timetable.list(query);
      setRows(list);
      setState(list.length === 0 ? "empty" : "loaded");
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
      setMessage(e instanceof Error ? e.message : "Failed to load timetable");
    }
  }, [isParent, selectedChild, weekday]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "denied") {
    return (
      <View className="flex-1 px-4 pt-16" style={{ backgroundColor: theme.colors.background }}>
        <DeniedState title="You cannot view this timetable" detail={message} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background, paddingTop: 56 }}>
      <View className="px-4">
        <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
        <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 12 }}>
          Timetable
        </AppText>
      </View>
      <ScrollView horizontal className="mt-4 px-4" contentContainerStyle={{ gap: 8 }}>
        {DAYS.map((d, i) => (
          <Pressable
            key={d}
            onPress={() => setWeekday(i + 1)}
            className="rounded-full px-3 py-2"
            style={{ backgroundColor: weekday === i + 1 ? theme.colors.primary : "white" }}
          >
            <AppText color={weekday === i + 1 ? "white" : theme.colors.ink}>{d}</AppText>
          </Pressable>
        ))}
      </ScrollView>
      {state === "loading" ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : null}
      {state === "offline" ? <OfflineState onRetry={() => void load()} /> : null}
      {state === "error" ? <ErrorState message={message} onRetry={() => void load()} /> : null}
      {state === "empty" ? (
        <View className="p-4">
          <EmptyState title="No periods" detail="No classes on this day." />
        </View>
      ) : null}
      {state === "loaded" ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {rows.map((r) => (
            <View key={r.id} className="mb-2 rounded-2xl bg-white p-4">
              <AppText variant="label">{r.subjectName}</AppText>
              <AppText variant="caption">
                {r.startTime}–{r.endTime} · {r.teacherName}
              </AppText>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
