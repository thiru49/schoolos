import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { EmptyState, ErrorState } from "../../components/states/Feedback";

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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const query = isParent && selectedChild
        ? { studentId: selectedChild.studentId, weekday }
        : { weekday };
      setRows(await (await api()).timetable.list(query));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load timetable");
    }
  }, [isParent, selectedChild, weekday]);

  useEffect(() => {
    void load();
  }, [load]);

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
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {rows.length === 0 && !error ? (
        <View className="p-4">
          <EmptyState title="No periods" detail="No classes on this day." />
        </View>
      ) : (
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
      )}
    </View>
  );
}
