import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarCheck,
  BookOpenCheck,
  Award,
  Clock,
  ChevronRight,
  Sparkles,
  Users,
} from "lucide-react-native";
import type { TimetablePeriod } from "./home-snapshot";
import { formatTeacherAttendanceMetric } from "./enduser-copy";
import { useBranding } from "../branding/branding-provider";
import { api } from "../../services/api";
import { Card, MetricCard, SectionHeader, Avatar, Badge } from "../../components/ui";
import { AppText } from "../../components/ui/AppText";

interface TeacherHomeDashboardProps {
  periods: TimetablePeriod[];
  onRefresh: () => void;
}

export function TeacherHomeDashboard({ periods }: TeacherHomeDashboardProps) {
  const { theme, acl } = useBranding();
  const router = useRouter();

  const [assignedSection, setAssignedSection] = useState("8-A");
  const [activeHomeworkCount, setActiveHomeworkCount] = useState(0);
  const [attendanceLabel, setAttendanceLabel] = useState("Pending");

  useEffect(() => {
    void (async () => {
      try {
        const client = await api();
        const sections = await client.academics.sections();
        if (sections.length === 0) return;
        setAssignedSection(sections[0].label);
        const date = new Date().toISOString().slice(0, 10);
        const [hw, roster] = await Promise.all([
          client.homework.list({ sectionId: sections[0].id }),
          client.attendanceApi.roster(sections[0].id, date),
        ]);
        setActiveHomeworkCount(hw.length);
        const total = roster.rows.length;
        const marked = roster.rows.filter((r) => Boolean(r.status)).length;
        setAttendanceLabel(formatTeacherAttendanceMetric({ total, marked, unmarked: total - marked }));
      } catch {
        /* best effort */
      }
    })();
  }, []);

  const todayDay = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const todayClasses = periods.filter((p) => p.weekday === todayDay);
  const totalClassesCount = todayClasses.length > 0 ? todayClasses.length : periods.length;
  const inkMuted = theme.colors.inkMuted ?? "#64748B";

  return (
    <View className="gap-y-6">
      <Card variant="elevated">
        <View className="flex-row items-center gap-x-3.5">
          <Avatar name={acl?.userId ?? "Teacher"} role="teacher" size="lg" />
          <View className="flex-1">
            <AppText variant="caption" style={{ color: inkMuted, fontWeight: "600", textTransform: "uppercase", fontSize: 11 }}>
              Welcome back
            </AppText>
            <AppText variant="title" style={{ fontSize: 18, fontWeight: "800", color: theme.colors.ink }} numberOfLines={1}>
              {acl?.userId ?? "Teacher"}
            </AppText>
            <View className="mt-1">
              <Badge label={`Class Teacher • ${assignedSection}`} variant="primary" />
            </View>
          </View>
        </View>
      </Card>

      <View>
        <SectionHeader title="Today's Overview" />
        <View className="flex-row gap-x-3 mb-3">
          <View className="flex-1">
            <MetricCard
              label="Today's Classes"
              value={totalClassesCount > 0 ? `${totalClassesCount} Periods` : "Free Today"}
              subtitle={`Section ${assignedSection}`}
              accentColor="#0284C7"
              icon={<Clock size={20} color="#0284C7" />}
              onPress={() => router.push("/timetable")}
            />
          </View>
          <View className="flex-1">
            <MetricCard
              label="Daily Attendance"
              value={attendanceLabel}
              subtitle={`Class ${assignedSection}`}
              accentColor="#059669"
              icon={<CalendarCheck size={20} color="#059669" />}
              onPress={() => router.push("/attendance")}
            />
          </View>
        </View>
        <View className="flex-row gap-x-3">
          <View className="flex-1">
            <MetricCard
              label="Active Homework"
              value={activeHomeworkCount > 0 ? `${activeHomeworkCount} Active` : "None Due"}
              subtitle={`Class ${assignedSection}`}
              accentColor="#7C3AED"
              icon={<BookOpenCheck size={20} color="#7C3AED" />}
              onPress={() => router.push("/homework")}
            />
          </View>
          <View className="flex-1">
            <MetricCard
              label="Marks Entry"
              value="Open book"
              subtitle="Draft then submit"
              accentColor="#EA580C"
              icon={<Award size={20} color="#EA580C" />}
              onPress={() => router.push("/marks")}
            />
          </View>
        </View>
      </View>

      <View>
        <SectionHeader title="Quick Actions" />
        <View className="gap-y-3">
          {[
            { route: "/attendance", title: "Mark Attendance", caption: `Record daily register for Class ${assignedSection}`, color: "#059669", icon: Users, badge: "Daily Roster", badgeVariant: "success" as const },
            { route: "/homework", title: "Assign Homework", caption: "Create and publish assignments with due dates", color: "#7C3AED", icon: BookOpenCheck, badge: "Curriculum", badgeVariant: "info" as const },
            { route: "/marks", title: "Enter Exam Marks", caption: "Draft marks then submit official scorecards", color: "#EA580C", icon: Award, badge: "Grading", badgeVariant: "warning" as const },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Pressable key={item.route} onPress={() => router.push(item.route as never)} className="active:opacity-80">
                <Card variant="default">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-x-3.5 flex-1 pr-2">
                      <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: `${item.color}16` }}>
                        <Icon size={24} color={item.color} />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-x-2">
                          <AppText variant="title" style={{ fontSize: 16, fontWeight: "700" }}>
                            {item.title}
                          </AppText>
                          <Badge label={item.badge} variant={item.badgeVariant} />
                        </View>
                        <AppText variant="caption" style={{ color: inkMuted, marginTop: 2 }}>
                          {item.caption}
                        </AppText>
                      </View>
                    </View>
                    <ChevronRight size={20} color={theme.colors.borderStrong ?? "#94A3B8"} />
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <SectionHeader title="Today's Schedule" actionLabel="View timetable →" onAction={() => router.push("/timetable")} />
        {todayClasses.length > 0 ? (
          <View className="gap-y-2.5">
            {todayClasses.slice(0, 3).map((period, idx) => (
              <Card key={period.id ?? idx} variant="default">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-x-3">
                    <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: `${theme.colors.primary}12` }}>
                      <AppText variant="caption" style={{ fontWeight: "700", color: theme.colors.primary }}>
                        P{idx + 1}
                      </AppText>
                    </View>
                    <View>
                      <AppText variant="title" style={{ fontSize: 15, fontWeight: "700" }}>
                        {period.subjectName ?? "Class"}
                      </AppText>
                      <AppText variant="caption" style={{ color: inkMuted }}>
                        {period.startTime} - {period.endTime} • Section {period.sectionLabel ?? assignedSection}
                      </AppText>
                    </View>
                  </View>
                  <Badge label={period.roomNumber ? `Room ${period.roomNumber}` : assignedSection} variant="neutral" />
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <Card variant="outlined" style={{ backgroundColor: theme.colors.surfaceMuted ?? "#F8FAFC" }}>
            <View className="items-center py-4">
              <Sparkles size={24} color={inkMuted} />
              <AppText variant="body" style={{ color: inkMuted, textAlign: "center", marginTop: 6 }}>
                No teaching periods scheduled for today.
              </AppText>
            </View>
          </Card>
        )}
      </View>
    </View>
  );
}
