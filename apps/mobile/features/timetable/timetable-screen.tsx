import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Clock, Calendar, BookOpen, User, Sparkles } from "lucide-react-native";
import { ApiError } from "@schoolos/api-client";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { resolveMobileHomeRole } from "../home/home-policy";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import {
  Screen,
  ScreenHeader,
  Card,
  MetricCard,
  Badge,
  Divider,
} from "../../components/ui";
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

  const currentRole = resolveMobileHomeRole(activeRole, acl?.roles);
  const isParent = currentRole === "parent";
  const isStudent = currentRole === "student";
  const isTeacher = currentRole === "teacher";

  const activeStudentId = isParent ? selectedChild?.studentId : undefined;
  const schoolId = acl?.schoolId;
  const userId = acl?.userId;
  const role = activeRole ?? (acl?.roles?.length === 1 ? acl.roles[0] : null);
  const childId = isParent ? activeStudentId : undefined;

  const [weekday, setWeekday] = useState<number>(getTodayWeekday());
  const [allPeriods, setAllPeriods] = useState<CachedPeriod[]>([]);
  const [teacherSections, setTeacherSections] = useState<
    Array<{ id: string; name: string; classId: string; className: string; label: string }>
  >([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [isCachedData, setIsCachedData] = useState(false);
  const [cachedTime, setCachedTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Periodically tick every 15 seconds to update active period status
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

  // Load teacher sections if applicable
  useEffect(() => {
    if (!isTeacher) return;
    let isMounted = true;
    (async () => {
      try {
        const client = await api();
        const secs = await client.academics.sections();
        if (!isMounted) return;
        setTeacherSections(secs);
        if (secs.length > 0 && !selectedSectionId) {
          setSelectedSectionId(secs[0].id);
        }
      } catch {
        // Fall back to server auto-resolving section from scope
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [isTeacher]);

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
        const query: { studentId?: string; sectionId?: string } = {};
        if (isParent && activeStudentId) {
          query.studentId = activeStudentId;
        } else if (isTeacher && selectedSectionId) {
          query.sectionId = selectedSectionId;
        }

        const list = await client.timetable.list(query);

        setAllPeriods(list);
        setIsCachedData(false);
        setCachedTime(null);
        setState("loaded");

        // Persist to scoped offline cache
        void setCachedTimetable(schoolId, userId, role, list, childId);
      } catch (e) {
        // Attempt fallback to partitioned offline cache
        const cached = await getCachedTimetable(schoolId, userId, role, childId);
        if (cached && cached.periods.length > 0) {
          setAllPeriods(cached.periods);
          setIsCachedData(true);
          setCachedTime(new Date(cached.cachedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          setState("loaded");
          return;
        }

        if (e instanceof ApiError && e.status === 403) {
          setState("denied");
          setMessage(e.message || "You are not authorized to view this timetable.");
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
    [isParent, selectedChild, activeStudentId, isTeacher, selectedSectionId, schoolId, userId, role, childId],
  );

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

  // Recurrly metric metrics
  const activeCount = useMemo(() => {
    return dayPeriods.filter(
      (p) => getPeriodStatus(p.weekday, weekday, currentTime, p.startTime, p.endTime) === "active",
    ).length;
  }, [dayPeriods, weekday, currentTime]);

  const upcomingCount = useMemo(() => {
    return dayPeriods.filter(
      (p) => getPeriodStatus(p.weekday, weekday, currentTime, p.startTime, p.endTime) === "upcoming",
    ).length;
  }, [dayPeriods, weekday, currentTime]);

  if (state === "denied") {
    return (
      <Screen scrollable={false}>
        <View className="p-4">
          <ScreenHeader
            title="Class Timetable"
            subtitle="Access restricted"
            showBack
            onBack={() => router.back()}
          />
          <View className="mt-8">
            <DeniedState title="Access Restricted" detail={message} />
          </View>
        </View>
      </Screen>
    );
  }

  const selectedSection = teacherSections.find((s) => s.id === selectedSectionId);

  return (
    <Screen scrollable={false}>
      {/* Top Header */}
      <View className="px-5 pt-3 pb-2">
        <ScreenHeader
          title={isTeacher ? "Class Timetable" : isStudent ? "My Timetable" : "Timetable"}
          subtitle={
            isTeacher
              ? `Assigned teaching schedule • ${selectedSection ? `Section ${selectedSection.label}` : "Section Schedule"}`
              : isStudent
              ? "Your weekly class schedule & room assignments"
              : "Class timetable and period timings"
          }
          showBack
          onBack={() => router.back()}
        />
      </View>

      {/* Parent Child Switcher */}
      {isParent ? (
        <View className="px-5 mb-2">
          <ChildSwitcher />
        </View>
      ) : null}

      {/* Teacher Section Switcher (if multiple assigned) */}
      {isTeacher && teacherSections.length > 1 ? (
        <View className="px-5 mb-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {teacherSections.map((sec) => {
              const isSel = sec.id === selectedSectionId;
              return (
                <Pressable
                  key={sec.id}
                  onPress={() => setSelectedSectionId(sec.id)}
                  className="px-3.5 py-1.5 rounded-xl flex-row items-center gap-x-1.5"
                  style={{
                    backgroundColor: isSel ? theme.colors.primary : "#F1F5F9",
                    borderWidth: 1,
                    borderColor: isSel ? theme.colors.primary : "#E2E8F0",
                  }}
                >
                  <AppText
                    variant="caption"
                    style={{
                      fontWeight: isSel ? "700" : "600",
                      color: isSel ? "#FFFFFF" : "#475569",
                    }}
                  >
                    Section {sec.label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Offline Cached Banner */}
      {isCachedData ? (
        <View className="mx-5 mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <AppText variant="caption" style={{ color: "#92400E", fontWeight: "600" }}>
              Offline Mode — Showing cached schedule{cachedTime ? ` (${cachedTime})` : ""}
            </AppText>
          </View>
          <Pressable
            onPress={() => void load(true)}
            className="px-3 py-1 rounded-lg bg-amber-600 active:opacity-80"
          >
            <AppText variant="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>
              Retry
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {/* Weekday Switcher */}
      <View className="mb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {DAYS.map((d) => {
            const isSelected = weekday === d.weekday;
            const isToday = d.weekday === todayWeekday;
            return (
              <Pressable
                key={d.weekday}
                onPress={() => setWeekday(d.weekday)}
                className="rounded-2xl px-4 py-2.5 items-center justify-center min-w-[56px]"
                style={{
                  backgroundColor: isSelected ? theme.colors.primary : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: isSelected ? theme.colors.primary : "#E2E8F0",
                  shadowColor: isSelected ? theme.colors.primary : "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isSelected ? 0.2 : 0.03,
                  shadowRadius: 4,
                  elevation: isSelected ? 3 : 1,
                }}
              >
                <AppText
                  variant="label"
                  style={{
                    color: isSelected ? "#FFFFFF" : "#334155",
                    fontWeight: isSelected ? "700" : "600",
                    fontSize: 14,
                  }}
                >
                  {d.label}
                </AppText>
                {isToday ? (
                  <View
                    className="mt-1 px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : "#EEF2FF",
                    }}
                  >
                    <AppText
                      variant="caption"
                      style={{
                        color: isSelected ? "#FFFFFF" : theme.colors.primary,
                        fontSize: 9,
                        fontWeight: "800",
                        textTransform: "uppercase",
                      }}
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

      {/* Recurrly Style Metric Summary Row */}
      {state === "loaded" || isCachedData ? (
        <View className="px-5 mb-3 flex-row gap-x-2.5">
          <View className="flex-1">
            <MetricCard
              label="Scheduled"
              value={`${dayPeriods.length}`}
              subtitle="Total periods"
            />
          </View>
          <View className="flex-1">
            <MetricCard
              label="Ongoing"
              value={activeCount > 0 ? "Active" : "None"}
              subtitle={activeCount > 0 ? "Class in session" : "No live class"}
            />
          </View>
          <View className="flex-1">
            <MetricCard
              label="Upcoming"
              value={`${upcomingCount}`}
              subtitle="Periods left"
            />
          </View>
        </View>
      ) : null}

      {/* Main Content Area */}
      <View className="flex-1 px-5">
        {state === "loading" && !refreshing ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <AppText variant="caption" style={{ marginTop: 12, color: "#64748B" }}>
              Loading schedule...
            </AppText>
          </View>
        ) : null}

        {state === "offline" && !isCachedData ? (
          <OfflineState onRetry={() => void load()} />
        ) : null}

        {state === "error" && !isCachedData ? (
          <ErrorState message={message} onRetry={() => void load()} />
        ) : null}

        {(state === "loaded" || isCachedData) && (
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40, gap: 12 }}
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
                title="No Timetable Published"
                detail="The school administration has not published a timetable for this section yet."
              />
            ) : dayPeriods.length === 0 ? (
              <EmptyState
                title="No Classes Scheduled"
                detail={`There are no classes scheduled for ${currentDayDef?.full ?? "this day"}.`}
              />
            ) : (
              dayPeriods.map((period, idx) => {
                const status = getPeriodStatus(
                  period.weekday,
                  weekday,
                  currentTime,
                  period.startTime,
                  period.endTime,
                );
                const isActive = status === "active";
                const isCompleted = status === "completed";

                return (
                  <Card
                    key={period.id || idx}
                    variant={isActive ? "elevated" : "default"}
                    style={{ opacity: isCompleted ? 0.75 : 1 }}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-x-2">
                        <View
                          className="w-8 h-8 rounded-xl items-center justify-center"
                          style={{
                            backgroundColor: isActive ? `${theme.colors.primary}20` : "#F1F5F9",
                          }}
                        >
                          <AppText
                            variant="caption"
                            style={{
                              fontWeight: "800",
                              color: isActive ? theme.colors.primary : "#475569",
                              fontSize: 12,
                            }}
                          >
                            P{idx + 1}
                          </AppText>
                        </View>
                        <AppText
                          variant="title"
                          style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: isActive ? theme.colors.primary : "#1E293B",
                          }}
                        >
                          {period.subjectName}
                        </AppText>
                      </View>

                      {isActive ? (
                        <Badge label="ACTIVE NOW" variant="primary" />
                      ) : status === "upcoming" ? (
                        <Badge label="UPCOMING" variant="info" />
                      ) : status === "completed" ? (
                        <Badge label="COMPLETED" variant="neutral" />
                      ) : null}
                    </View>

                    <Divider marginVertical={8} />

                    <View className="flex-row items-center justify-between pt-1">
                      <View className="flex-row items-center gap-x-1.5">
                        <Clock size={14} color="#64748B" />
                        <AppText
                          variant="caption"
                          style={{
                            color: isActive ? theme.colors.primary : "#475569",
                            fontWeight: "600",
                          }}
                        >
                          {period.startTime} – {period.endTime}
                        </AppText>
                      </View>

                      <View className="flex-row items-center gap-x-1.5">
                        <User size={14} color="#64748B" />
                        <AppText
                          variant="caption"
                          style={{ color: "#64748B", fontWeight: "500" }}
                        >
                          {isTeacher
                            ? `${period.sectionId ? "Section" : period.teacherName}`
                            : period.teacherName}
                        </AppText>
                      </View>
                    </View>
                  </Card>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}
