import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarCheck,
  BookOpenCheck,
  Award,
  Clock,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Users,
} from "lucide-react-native";
import type { TimetablePeriod } from "./home-snapshot";
import { useBranding } from "../branding/branding-provider";
import { api } from "../../services/api";
import {
  Card,
  MetricCard,
  SectionHeader,
  Avatar,
  Badge,
  AppButton,
} from "../../components/ui";
import { AppText } from "../../components/ui/AppText";

interface TeacherHomeDashboardProps {
  periods: TimetablePeriod[];
  onRefresh: () => void;
}

export function TeacherHomeDashboard({ periods, onRefresh }: TeacherHomeDashboardProps) {
  const { theme, branding, acl } = useBranding();
  const router = useRouter();

  const [assignedSection, setAssignedSection] = useState<string>("8-A");
  const [activeHomeworkCount, setActiveHomeworkCount] = useState<number>(0);

  useEffect(() => {
    void (async () => {
      try {
        const client = await api();
        const sections = await client.academics.sections();
        if (sections.length > 0) {
          setAssignedSection(sections[0].label);
          const hw = await client.homework.list({ sectionId: sections[0].id });
          setActiveHomeworkCount(hw.length);
        }
      } catch {
        /* best effort */
      }
    })();
  }, []);

  // Filter periods for today
  const todayDay = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const todayClasses = periods.filter((p) => p.weekday === todayDay);
  const totalClassesCount = todayClasses.length > 0 ? todayClasses.length : periods.length;

  return (
    <View className="gap-y-6">
      {/* 1. Teacher Identity & Greeting Banner */}
      <Card variant="elevated" style={{ backgroundColor: "#FFFFFF" }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-x-3.5 flex-1 pr-2">
            <Avatar
              name={acl?.userId ?? "Teacher"}
              role="teacher"
              size="lg"
            />
            <View className="flex-1">
              <View className="flex-row items-center gap-x-2 mb-1">
                <AppText
                  variant="caption"
                  style={{ color: "#64748B", fontWeight: "600", textTransform: "uppercase", fontSize: 11 }}
                >
                  Welcome back
                </AppText>
              </View>
              <AppText
                variant="title"
                style={{ fontSize: 18, fontWeight: "800", color: "#1E293B" }}
                numberOfLines={1}
              >
                {acl?.userId ?? "Maria Selvam"}
              </AppText>
              <View className="flex-row items-center gap-x-2 mt-1">
                <Badge label={`Class Teacher • ${assignedSection}`} variant="primary" />
              </View>
            </View>
          </View>
        </View>
      </Card>

      {/* 2. Key Operational Metrics (Recurrly Metric Pattern) */}
      <View>
        <SectionHeader title="Today's Overview" />
        <View className="flex-row gap-x-3 mb-3">
          <View className="flex-1">
            <MetricCard
              label="Today's Classes"
              value={totalClassesCount > 0 ? `${totalClassesCount} Periods` : "Free Today"}
              subtitle={assignedSection ? `Section ${assignedSection}` : "Assigned"}
              accentColor="#0284C7"
              icon={<Clock size={20} color="#0284C7" />}
              onPress={() => router.push("/timetable")}
            />
          </View>
          <View className="flex-1">
            <MetricCard
              label="Daily Attendance"
              value="Pending"
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
              value="Mid-Term 1"
              subtitle="Draft Scores"
              accentColor="#EA580C"
              icon={<Award size={20} color="#EA580C" />}
              onPress={() => router.push("/marks")}
            />
          </View>
        </View>
      </View>

      {/* 3. Quick Action Cards */}
      <View>
        <SectionHeader title="Quick Actions" />
        <View className="gap-y-3">
          <Pressable onPress={() => router.push("/attendance")} className="active:opacity-80">
            <Card variant="default">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-x-3.5 flex-1 pr-2">
                  <View
                    className="w-12 h-12 rounded-2xl items-center justify-center shadow-sm"
                    style={{ backgroundColor: "#05966916" }}
                  >
                    <Users size={24} color="#059669" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-x-2">
                      <AppText variant="title" style={{ fontSize: 16, fontWeight: "700" }}>
                        Mark Attendance
                      </AppText>
                      <Badge label="Daily Roster" variant="success" />
                    </View>
                    <AppText variant="caption" style={{ color: "#64748B", marginTop: 2 }}>
                      Record daily student attendance for Class {assignedSection}
                    </AppText>
                  </View>
                </View>
                <ChevronRight size={20} color="#94A3B8" />
              </View>
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push("/homework")} className="active:opacity-80">
            <Card variant="default">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-x-3.5 flex-1 pr-2">
                  <View
                    className="w-12 h-12 rounded-2xl items-center justify-center shadow-sm"
                    style={{ backgroundColor: "#7C3AED16" }}
                  >
                    <BookOpenCheck size={24} color="#7C3AED" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-x-2">
                      <AppText variant="title" style={{ fontSize: 16, fontWeight: "700" }}>
                        Assign Homework
                      </AppText>
                      <Badge label="Curriculum" variant="info" />
                    </View>
                    <AppText variant="caption" style={{ color: "#64748B", marginTop: 2 }}>
                      Create and publish assignments with due dates
                    </AppText>
                  </View>
                </View>
                <ChevronRight size={20} color="#94A3B8" />
              </View>
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push("/marks")} className="active:opacity-80">
            <Card variant="default">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-x-3.5 flex-1 pr-2">
                  <View
                    className="w-12 h-12 rounded-2xl items-center justify-center shadow-sm"
                    style={{ backgroundColor: "#EA580C16" }}
                  >
                    <Award size={24} color="#EA580C" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-x-2">
                      <AppText variant="title" style={{ fontSize: 16, fontWeight: "700" }}>
                        Enter Exam Marks
                      </AppText>
                      <Badge label="Grading" variant="warning" />
                    </View>
                    <AppText variant="caption" style={{ color: "#64748B", marginTop: 2 }}>
                      Enter draft marks and submit official scorecards
                    </AppText>
                  </View>
                </View>
                <ChevronRight size={20} color="#94A3B8" />
              </View>
            </Card>
          </Pressable>
        </View>
      </View>

      {/* 4. Today's Schedule Snapshot */}
      <View>
        <SectionHeader
          title="Today's Schedule"
          actionLabel="View timetable →"
          onAction={() => router.push("/timetable")}
        />
        {todayClasses.length > 0 ? (
          <View className="gap-y-2.5">
            {todayClasses.slice(0, 3).map((period, idx) => (
              <Card key={period.id ?? idx} variant="default">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-x-3">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: `${theme.colors.primary}12` }}
                    >
                      <AppText
                        variant="caption"
                        style={{ fontWeight: "700", color: theme.colors.primary }}
                      >
                        P{idx + 1}
                      </AppText>
                    </View>
                    <View>
                      <AppText variant="title" style={{ fontSize: 15, fontWeight: "700" }}>
                        {period.subjectName ?? "Class"}
                      </AppText>
                      <AppText variant="caption" style={{ color: "#64748B" }}>
                        {period.startTime} - {period.endTime} • Section {period.sectionLabel ?? assignedSection}
                      </AppText>
                    </View>
                  </View>
                  <Badge label={period.roomNumber ? `Room ${period.roomNumber}` : assignedSection ? `Sec ${assignedSection}` : "Main Block"} variant="neutral" />
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <Card variant="outlined" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
            <View className="items-center py-4">
              <Sparkles size={24} color="#94A3B8" style={{ marginBottom: 6 }} />
              <AppText variant="body" style={{ color: "#64748B", textAlign: "center" }}>
                No active teaching periods scheduled for today.
              </AppText>
              <Pressable
                onPress={() => router.push("/timetable")}
                className="mt-2 flex-row items-center"
              >
                <AppText variant="caption" color={theme.colors.primary} style={{ fontWeight: "600" }}>
                  Check weekly timetable →
                </AppText>
              </Pressable>
            </View>
          </Card>
        )}
      </View>
    </View>
  );
}
