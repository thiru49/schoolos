import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { ChildSwitcher } from "./child-switcher";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { ErrorState } from "../../components/states/Feedback";

const LABELS: Record<string, string> = { P: "Present", A: "Absent", L: "Late", H: "Holiday" };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ParentHome() {
  const { branding, theme, selectedChild } = useBranding();
  const router = useRouter();
  const [todayStatus, setTodayStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (!selectedChild) {
      setTodayStatus(null);
      return;
    }
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await (await api()).attendanceApi.list({ studentId: selectedChild.studentId });
        const row = data.records.find((r) => r.date === today());
        setTodayStatus(row?.status ?? null);

      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load attendance");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedChild]);

  return (
    <View className="flex-1 px-6 pt-16" style={{ backgroundColor: theme.colors.background }}>
      <AppText variant="caption" color={theme.colors.primary}>
        {branding?.schoolName}
      </AppText>
      <AppText variant="title" style={{ marginTop: 4 }}>
        Today
      </AppText>
      <View className="mt-4">
        <ChildSwitcher />
      </View>
      {error ? (
        <View className="mt-6">
          <ErrorState message={error} />
        </View>
      ) : null}
      {selectedChild ? (
        <View className="mt-4 rounded-2xl bg-white p-4">
          <AppText variant="label">Attendance</AppText>
          <AppText variant="caption">
            {selectedChild.fullName} · {selectedChild.className}-{selectedChild.sectionName}
          </AppText>
          <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 8 }}>
            {loading ? "…" : todayStatus ? LABELS[todayStatus] ?? todayStatus : "Not marked yet"}
          </AppText>
        </View>
      ) : null}
      <View className="mt-4 rounded-2xl bg-white p-4">
        <AppText variant="label">Fees / homework</AppText>
        <AppText variant="caption">Not in this slice</AppText>
      </View>
      <View className="mt-6">
        <AppButton label="View attendance history" onPress={() => router.push("/attendance")} />
      </View>
    </View>
  );
}
