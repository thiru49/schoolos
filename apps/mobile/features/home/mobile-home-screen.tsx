import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@schoolos/api-client";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { ChildSwitcher } from "../parent/child-switcher";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { DeniedState, ErrorState, OfflineState } from "../../components/states/Feedback";
import {
  filterVisibleShortcuts,
  getMobileHomeTitle,
  needsActiveRoleSelection,
  resolveMobileHomeRole,
  type MobileHomeRole,
} from "./home-policy";
import { HomeShortcutGrid } from "./home-shortcut-grid";
import {
  formatAttendanceStatus,
  formatFeeDues,
  summarizeTodayClasses,
  todayIsoDate,
  type TimetablePeriod,
} from "./home-snapshot";
import { TeacherHomeDashboard } from "./teacher-home-dashboard";

type SnapshotState = "idle" | "loading" | "loaded" | "error" | "offline" | "denied";

function useParentSnapshot(selectedChildId: string | undefined, refreshKey: number) {
  const [attendanceStatus, setAttendanceStatus] = useState<string | null>(null);
  const [dues, setDues] = useState<number | null>(null);
  const [state, setState] = useState<SnapshotState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedChildId) {
      setAttendanceStatus(null);
      setDues(null);
      setState("idle");
      setMessage(null);
      return;
    }

    setState("loading");
    setMessage(null);
    void (async () => {
      try {
        const client = await api();
        const [attendance, summary] = await Promise.all([
          client.attendanceApi.list({ studentId: selectedChildId }),
          client.fees.summary(selectedChildId),
        ]);
        const row = attendance.records.find((record) => record.date === todayIsoDate());
        setAttendanceStatus(row?.status ?? null);
        setDues(summary.dues);
        setState("loaded");
      } catch (error) {
        setAttendanceStatus(null);
        setDues(null);
        if (error instanceof TypeError) {
          setState("offline");
          setMessage("You appear to be offline.");
          return;
        }
        if (error instanceof ApiError && error.status === 403) {
          setState("denied");
          setMessage(error.message);
          return;
        }
        setState("error");
        setMessage(error instanceof Error ? error.message : "Could not load today");
      }
    })();
  }, [selectedChildId, refreshKey]);

  return { attendanceStatus, dues, state, message };
}

function useTodayClassesSnapshot(role: MobileHomeRole | null, refreshKey: number) {
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [state, setState] = useState<SnapshotState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (role !== "teacher" && role !== "student") {
      setPeriods([]);
      setSummary(null);
      setState("idle");
      setMessage(null);
      return;
    }

    setState("loading");
    setMessage(null);
    void (async () => {
      try {
        const client = await api();
        const list = (await client.timetable.list()) as TimetablePeriod[];
        setPeriods(list);
        setSummary(summarizeTodayClasses(list));
        setState("loaded");
      } catch (error) {
        setPeriods([]);
        setSummary(null);
        if (error instanceof TypeError) {
          setState("offline");
          setMessage("You appear to be offline.");
          return;
        }
        if (error instanceof ApiError && error.status === 403) {
          setState("denied");
          setMessage(error.message);
          return;
        }
        setState("error");
        setMessage(error instanceof Error ? error.message : "Could not load today's schedule");
      }
    })();
  }, [role, refreshKey]);

  return { periods, summary, state, message };
}

function SnapshotFeedback({
  state,
  message,
  onRetry,
}: {
  state: SnapshotState;
  message: string | null;
  onRetry?: () => void;
}) {
  if (state === "loading") {
    return (
      <View className="mt-4 items-center rounded-2xl bg-white px-4 py-8">
        <ActivityIndicator />
        <AppText variant="caption" style={{ marginTop: 8 }}>
          Loading today…
        </AppText>
      </View>
    );
  }
  if (state === "offline") {
    return (
      <View className="mt-4">
        <OfflineState onRetry={onRetry ?? (() => undefined)} />
      </View>
    );
  }
  if (state === "denied") {
    return (
      <View className="mt-4">
        <DeniedState title="Access restricted" detail={message ?? "You do not have permission to view this data."} />
      </View>
    );
  }
  if (state === "error") {
    return (
      <View className="mt-4">
        <ErrorState message={message ?? "Could not load today"} onRetry={onRetry} />
      </View>
    );
  }
  return null;
}

export function MobileHomeScreen() {
  const { branding, theme, acl, activeRole, selectedChild } = useBranding();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const homeRole = resolveMobileHomeRole(activeRole, acl?.roles);
  const roleSelectionRequired = needsActiveRoleSelection(activeRole, acl?.roles);
  const permissions = acl?.permissions ?? [];
  const shortcuts = homeRole ? filterVisibleShortcuts(homeRole, permissions) : [];

  const parentSnapshot = useParentSnapshot(selectedChild?.studentId, refreshKey);
  const todayClasses = useTodayClassesSnapshot(homeRole, refreshKey);

  const shortcutSubtitles = useMemo(() => {
    const subtitles: Partial<Record<string, string>> = {};
    if (homeRole === "teacher" && todayClasses.summary) {
      subtitles["today-classes"] = todayClasses.summary;
    }
    if (homeRole === "student" && todayClasses.summary) {
      subtitles.timetable = todayClasses.summary;
    }
    return subtitles;
  }, [homeRole, todayClasses.summary]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((value) => value + 1);
    setTimeout(() => setRefreshing(false), 400);
  }, []);

  if (roleSelectionRequired) {
    return (
      <View className="flex-1 px-6 pt-16" style={{ backgroundColor: theme.colors.background }}>
        <AppText variant="caption" color={theme.colors.primary}>
          {branding?.schoolName}
        </AppText>
        <AppText variant="title" style={{ marginTop: 4 }}>
          Choose a role
        </AppText>
        <AppText variant="caption" style={{ marginTop: 8 }}>
          Your account has multiple roles. Select an active role in Profile to load your home screen.
        </AppText>
        <View className="mt-6">
          <AppButton label="Open Profile" onPress={() => router.push("/(tabs)/profile")} />
        </View>
      </View>
    );
  }

  if (!homeRole) {
    return (
      <View className="flex-1 px-6 pt-16" style={{ backgroundColor: theme.colors.background }}>
        <AppText variant="caption" color={theme.colors.primary}>
          {branding?.schoolName}
        </AppText>
        <AppText variant="title" style={{ marginTop: 4 }}>
          Home
        </AppText>
        <AppText variant="caption" style={{ marginTop: 8 }}>
          No supported mobile home view is available for this account.
        </AppText>
      </View>
    );
  }

  const showParentSnapshot = homeRole === "parent";
  const showTodayPreview = homeRole === "teacher" || homeRole === "student";
  const previewState = showTodayPreview ? todayClasses.state : "idle";
  const previewMessage = showTodayPreview ? todayClasses.message : null;

  return (
    <ScrollView
      className="flex-1 px-6 pt-16"
      style={{ backgroundColor: theme.colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <AppText variant="caption" color={theme.colors.primary}>
        {branding?.schoolName}
      </AppText>
      <AppText variant="title" style={{ marginTop: 4, marginBottom: 16 }}>
        {getMobileHomeTitle(homeRole)}
      </AppText>

      {homeRole === "teacher" ? (
        <TeacherHomeDashboard
          periods={todayClasses.periods}
          onRefresh={onRefresh}
        />
      ) : (
        <>
          {homeRole === "parent" ? (
            <View className="mt-4">
              <ChildSwitcher />
            </View>
          ) : null}

          {showParentSnapshot ? (
            <>
              <SnapshotFeedback
                state={parentSnapshot.state}
                message={parentSnapshot.message}
                onRetry={() => setRefreshKey((value) => value + 1)}
              />
              {selectedChild && parentSnapshot.state === "loaded" ? (
                <>
                  <View className="mt-4 rounded-2xl bg-white p-4">
                    <AppText variant="label">Attendance</AppText>
                    <AppText variant="caption">
                      {selectedChild.fullName} · {selectedChild.className}-{selectedChild.sectionName}
                    </AppText>
                    <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 8 }}>
                      {formatAttendanceStatus(parentSnapshot.attendanceStatus)}
                    </AppText>
                  </View>
                  <View className="mt-4 rounded-2xl bg-white p-4">
                    <AppText variant="label">Fees</AppText>
                    <AppText variant="caption">{selectedChild.fullName}</AppText>
                    <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 8 }}>
                      {formatFeeDues(parentSnapshot.dues)}
                    </AppText>
                  </View>
                </>
              ) : null}
              {selectedChild == null ? (
                <View className="mt-4 rounded-2xl bg-white p-4">
                  <AppText variant="caption">Select a child to see today&apos;s attendance and fees.</AppText>
                </View>
              ) : null}
            </>
          ) : null}

          {showTodayPreview ? (
            <SnapshotFeedback
              state={previewState}
              message={previewMessage}
              onRetry={() => setRefreshKey((value) => value + 1)}
            />
          ) : null}

          <View className="mt-6">
            <AppText variant="label" style={{ marginBottom: 12 }}>
              Quick links
            </AppText>
            <HomeShortcutGrid shortcuts={shortcuts} subtitles={shortcutSubtitles} />
          </View>
        </>
      )}
    </ScrollView>
  );
}
