import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@schoolos/api-client";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { DeniedState, EmptyState, ErrorState, OfflineState } from "../../components/states/Feedback";
import { ChildSwitcher } from "../parent/child-switcher";
import {
  getCachedTimetable,
  setCachedTimetable,
  type CachedPeriod,
} from "./timetable-cache";

const DAYS = [
  { label: "Mon", weekday: 1, full: "Monday" },
  { label: "Tue", weekday: 2, full: "Tuesday" },
  { label: "Wed", weekday: 3, full: "Wednesday" },
  { label: "Thu", weekday: 4, full: "Thursday" },
  { label: "Fri", weekday: 5, full: "Friday" },
  { label: "Sat", weekday: 6, full: "Saturday" },
  { label: "Sun", weekday: 7, full: "Sunday" },
];

function getTodayWeekday(): number {
  const day = new Date().getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  return day === 0 ? 7 : day;
}

function getPeriodStatus(
  periodWeekday: number,
  selectedWeekday: number,
  currentDate: Date,
  startTime: string,
  endTime: string,
): "active" | "upcoming" | "completed" | "none" {
  const todayWeekday = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
  // Only calculate dynamic status when viewing Today's timetable
  if (selectedWeekday !== todayWeekday || periodWeekday !== todayWeekday) {
    return "none";
  }

  const [sH, sM] = startTime.split(":").map(Number);
  const [eH, eM] = endTime.split(":").map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return "none";

  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
  const startMinutes = sH * 60 + sM;
  const endMinutes = eH * 60 + eM;

  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    return "active";
  }
  if (currentMinutes < startMinutes) {
    return "upcoming";
  }
  return "completed";
}

export function TimetableScreen() {
  const { theme, acl, activeRole, selectedChild } = useBranding();
  const router = useRouter();

  const isParent = Boolean(acl?.roles.includes("parent"));
  const isStudent = Boolean(acl?.roles.includes("student"));
  const activeStudentId = isParent ? selectedChild?.studentId : undefined;
  const schoolId = acl?.schoolId;
  const userId = acl?.userId;
  const role =
    activeRole ?? (acl?.roles?.length === 1 ? acl.roles[0] : null);
  const childId = isParent ? activeStudentId : undefined;

  const [weekday, setWeekday] = useState<number>(getTodayWeekday());
  const [allPeriods, setAllPeriods] = useState<CachedPeriod[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [isCachedData, setIsCachedData] = useState(false);
  const [cachedTime, setCachedTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Periodically tick every 15 seconds so active period updates while the screen remains open
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const todayWeekday = useMemo(() => {
    const day = currentTime.getDay();
    return day === 0 ? 7 : day;
  }, [currentTime]);

  const load = useCallback(
    async (isPullToRefresh = false) => {
      if (isParent && !selectedChild) {
        setAllPeriods([]);
        setState("empty");
        setMessage("No linked children found. Please contact the school office.");
        return;
      }

      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setState("loading");
      }
      setMessage("");

      if (!schoolId || !userId || !role) {
        setState("error");
        setMessage("Session context is incomplete. Please sign in again.");
        return;
      }

      try {
        const client = await api();
        // Fetch all published periods for the student/child section across the entire week
        const query = isParent && activeStudentId ? { studentId: activeStudentId } : {};
        const list = await client.timetable.list(query);

        setAllPeriods(list);
        setIsCachedData(false);
        setCachedTime(null);
        setState("loaded");

        // Persist to scoped offline storage
        void setCachedTimetable(schoolId, userId, role, list, childId);
      } catch (e) {
        // Attempt to load from scoped offline cache
        const cached = await getCachedTimetable(schoolId, userId, role, childId);
        if (cached && cached.periods.length > 0) {
          setAllPeriods(cached.periods);
          setIsCachedData(true);
          setCachedTime(new Date(cached.cachedAt).toLocaleTimeString());
          setState("loaded");
          return;
        }

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
      } finally {
        if (isPullToRefresh) {
          setRefreshing(false);
        }
      }
    },
    [isParent, selectedChild, activeStudentId, schoolId, userId, role, childId],
  );

  // Reload whenever the selected child or parent status changes, clearing existing state
  useEffect(() => {
    setAllPeriods([]);
    setIsCachedData(false);
    void load();
  }, [load]);

  const dayPeriods = useMemo(() => {
    return allPeriods.filter((p) => p.weekday === weekday);
  }, [allPeriods, weekday]);

  const currentDayDef = useMemo(() => {
    return DAYS.find((d) => d.weekday === weekday);
  }, [weekday]);

  if (state === "denied") {
    return (
      <View className="flex-1 px-4 pt-16" style={{ backgroundColor: theme.colors.background }}>
        <DeniedState title="You cannot view this timetable" detail={message} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background, paddingTop: 56 }}>
      {/* Header */}
      <View className="px-4">
        <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
        <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 12 }}>
          {isStudent ? "My Timetable" : "Timetable"}
        </AppText>
      </View>

      {/* Parent Child Switcher */}
      {isParent ? (
        <View className="mt-3 px-4">
          <ChildSwitcher />
        </View>
      ) : null}

      {/* Offline Cached Banner */}
      {isCachedData ? (
        <View className="mx-4 mt-3 flex-row items-center justify-between rounded-xl bg-amber-50 p-3 border border-amber-200">
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color="#92400e">
              Offline — Showing cached schedule{cachedTime ? ` from ${cachedTime}` : ""}
            </AppText>
          </View>
          <Pressable
            onPress={() => void load(true)}
            className="ml-2 rounded-lg bg-amber-600 px-2.5 py-1"
          >
            <AppText variant="caption" color="#ffffff">
              Retry
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {/* Day Switcher */}
      <View className="mt-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {DAYS.map((d) => {
            const isSelected = weekday === d.weekday;
            const isToday = d.weekday === todayWeekday;
            return (
              <Pressable
                key={d.weekday}
                onPress={() => setWeekday(d.weekday)}
                className="rounded-2xl px-4 py-2 items-center justify-center"
                style={{
                  backgroundColor: isSelected ? theme.colors.primary : "#ffffff",
                  borderWidth: 1,
                  borderColor: isSelected ? theme.colors.primary : "#e2e8f0",
                  minWidth: 54,
                }}
              >
                <AppText
                  variant="label"
                  color={isSelected ? "#ffffff" : theme.colors.ink}
                  style={{ fontWeight: isSelected ? "700" : "500" }}
                >
                  {d.label}
                </AppText>
                {isToday ? (
                  <View
                    className="mt-1 px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : "#e0e7ff",
                    }}
                  >
                    <AppText
                      variant="caption"
                      color={isSelected ? "#ffffff" : theme.colors.primary}
                      style={{ fontSize: 9, lineHeight: 11, fontWeight: "700" }}
                    >
                      Today
                    </AppText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* States Presentation */}
      {state === "loading" && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : null}

      {state === "offline" && !isCachedData ? (
        <OfflineState onRetry={() => void load()} />
      ) : null}

      {state === "error" && !isCachedData ? (
        <ErrorState message={message} onRetry={() => void load()} />
      ) : null}

      {isParent && !selectedChild ? (
        <View className="p-4">
          <EmptyState
            title="No linked children"
            detail="No student profile is linked to your parent account. Please contact the school office."
          />
        </View>
      ) : null}

      {state === "loaded" || isCachedData ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          {allPeriods.length === 0 ? (
            <EmptyState
              title="No Published Timetable"
              detail="No published timetable is available yet for this class. Please check back once school administration releases the schedule."
            />
          ) : dayPeriods.length === 0 ? (
            <EmptyState
              title="No Classes Scheduled"
              detail={`No classes scheduled for ${currentDayDef?.full ?? "this day"}.`}
            />
          ) : (
            dayPeriods.map((r) => {
              const status = getPeriodStatus(
                r.weekday,
                weekday,
                currentTime,
                r.startTime,
                r.endTime,
              );
              const isActive = status === "active";
              const isCompleted = status === "completed";

              return (
                <View
                  key={r.id}
                  className="mb-3 rounded-2xl bg-white p-4"
                  style={{
                    borderWidth: isActive ? 2 : 1,
                    borderColor: isActive ? theme.colors.primary : "#f1f5f9",
                    shadowColor: isActive ? theme.colors.primary : "#000",
                    shadowOffset: { width: 0, height: isActive ? 4 : 1 },
                    shadowOpacity: isActive ? 0.15 : 0.05,
                    shadowRadius: isActive ? 6 : 2,
                    elevation: isActive ? 3 : 1,
                    opacity: isCompleted ? 0.75 : 1,
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <AppText
                      variant="label"
                      color={isActive ? theme.colors.primary : theme.colors.ink}
                      style={{ fontSize: 16, fontWeight: "700" }}
                    >
                      {r.subjectName}
                    </AppText>
                    {isActive ? (
                      <View
                        className="rounded-full px-2.5 py-0.5"
                        style={{ backgroundColor: theme.colors.primary }}
                      >
                        <AppText variant="caption" color="#ffffff" style={{ fontWeight: "700" }}>
                          ONGOING
                        </AppText>
                      </View>
                    ) : status === "upcoming" ? (
                      <View className="rounded-full bg-blue-50 px-2 py-0.5 border border-blue-200">
                        <AppText variant="caption" color="#1e40af" style={{ fontSize: 11 }}>
                          Upcoming
                        </AppText>
                      </View>
                    ) : status === "completed" ? (
                      <View className="rounded-full bg-slate-100 px-2 py-0.5">
                        <AppText variant="caption" color="#64748b" style={{ fontSize: 11 }}>
                          Completed
                        </AppText>
                      </View>
                    ) : null}
                  </View>

                  <View className="mt-2 flex-row items-center justify-between">
                    <AppText
                      variant="caption"
                      color={isActive ? theme.colors.primary : "#475569"}
                      style={{ fontWeight: isActive ? "600" : "500" }}
                    >
                      {r.startTime} – {r.endTime}
                    </AppText>
                    <AppText variant="caption" color="#64748b">
                      {r.teacherName}
                    </AppText>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}
