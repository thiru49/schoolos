import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@schoolos/api-client";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { ChildSwitcher } from "./child-switcher";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { ErrorState, OfflineState } from "../../components/states/Feedback";

const LABELS: Record<string, string> = { P: "Present", A: "Absent", L: "Late", H: "Holiday" };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ParentHome() {
  const { branding, theme, selectedChild } = useBranding();
  const router = useRouter();
  const [todayStatus, setTodayStatus] = useState<string | null>(null);
  const [dues, setDues] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!selectedChild) {
      setTodayStatus(null);
      setDues(null);
      return;
    }
    setLoading(true);
    setError(null);
    setOffline(false);
    void (async () => {
      try {
        const client = await api();
        const [attendance, summary] = await Promise.all([
          client.attendanceApi.list({ studentId: selectedChild.studentId }),
          client.fees.summary(selectedChild.studentId),
        ]);
        const row = attendance.records.find((r) => r.date === today());
        setTodayStatus(row?.status ?? null);
        setDues(summary.dues);
      } catch (e) {
        if (e instanceof TypeError) {
          setOffline(true);
          setError("You appear to be offline.");
        } else if (e instanceof ApiError && e.status === 403) {
          setError(e.message);
        } else {
          setError(e instanceof Error ? e.message : "Could not load today");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedChild, tick]);

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
      {offline ? (
        <View className="mt-6">
          <OfflineState onRetry={() => setTick((n) => n + 1)} />
        </View>
      ) : null}
      {error && !offline ? (
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
      {selectedChild ? (
        <View className="mt-4 rounded-2xl bg-white p-4">
          <AppText variant="label">Fees</AppText>
          <AppText variant="caption">{selectedChild.fullName}</AppText>
          <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 8 }}>
            {loading ? "…" : dues === 0 ? "No dues" : dues == null ? "—" : `Dues ₹${dues}`}
          </AppText>
        </View>
      ) : null}
      <View className="mt-6">
        <AppButton label="View attendance history" onPress={() => router.push("/attendance")} />
      </View>
      <View className="mt-3">
        <AppButton label="View fees" variant="secondary" onPress={() => router.push("/fees")} />
      </View>
    </View>
  );
}
