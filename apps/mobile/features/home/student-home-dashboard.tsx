import React from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarCheck,
  BookOpenCheck,
  Award,
  Clock,
  ChevronRight,
  FileText,
  Sparkles,
} from "lucide-react-native";
import type { TimetablePeriod } from "./home-snapshot";
import { filterTodayPeriods, summarizeTodayClasses } from "./home-snapshot";
import { formatStudentIdentity } from "./enduser-copy";
import { useBranding } from "../branding/branding-provider";
import { Card, MetricCard, SectionHeader, Avatar, Badge } from "../../components/ui";
import { AppText } from "../../components/ui/AppText";

export function StudentHomeDashboard({ periods }: { periods: TimetablePeriod[] }) {
  const { theme, branding, acl, selectedChild } = useBranding();
  const router = useRouter();
  const today = filterTodayPeriods(periods);
  const summary = summarizeTodayClasses(periods);
  const identity = formatStudentIdentity({
    fullName: selectedChild?.fullName,
    userId: acl?.userId,
    className: selectedChild?.className,
    sectionName: selectedChild?.sectionName,
  });
  const inkMuted = theme.colors.inkMuted ?? "#64748B";

  return (
    <View className="gap-y-6">
      <Card variant="elevated">
        <View className="flex-row items-center gap-x-3.5">
          <Avatar name={identity.title} role="student" size="lg" />
          <View className="flex-1">
            <AppText variant="caption" style={{ color: inkMuted, fontWeight: "600", textTransform: "uppercase", fontSize: 11 }}>
              {branding?.schoolName ?? "Arul Neri Academy"}
            </AppText>
            <AppText variant="title" style={{ fontSize: 18, fontWeight: "800", color: theme.colors.ink }} numberOfLines={1}>
              {identity.title}
            </AppText>
            <View className="mt-1">
              <Badge label={identity.badge} variant="neutral" />
            </View>
          </View>
        </View>
      </Card>

      <View>
        <SectionHeader title="Today" />
        <View className="flex-row gap-x-3 mb-3">
          <View className="flex-1">
            <MetricCard
              label="Schedule"
              value={summary}
              subtitle={`${today.length} period${today.length === 1 ? "" : "s"}`}
              accentColor="#0284C7"
              icon={<Clock size={20} color="#0284C7" />}
              onPress={() => router.push("/timetable")}
            />
          </View>
          <View className="flex-1">
            <MetricCard
              label="Homework"
              value="Open list"
              subtitle="Assigned to you"
              accentColor="#7C3AED"
              icon={<BookOpenCheck size={20} color="#7C3AED" />}
              onPress={() => router.push("/homework")}
            />
          </View>
        </View>
        <View className="flex-row gap-x-3">
          <View className="flex-1">
            <MetricCard
              label="Attendance"
              value="My record"
              subtitle="P / A / L / H"
              accentColor="#059669"
              icon={<CalendarCheck size={20} color="#059669" />}
              onPress={() => router.push("/attendance")}
            />
          </View>
          <View className="flex-1">
            <MetricCard
              label="Results"
              value="Published"
              subtitle="Marks & report card"
              accentColor="#EA580C"
              icon={<Award size={20} color="#EA580C" />}
              onPress={() => router.push("/marks")}
            />
          </View>
        </View>
      </View>

      <View>
        <SectionHeader title="Today's periods" actionLabel="Full timetable →" onAction={() => router.push("/timetable")} />
        {today.length > 0 ? (
          <View className="gap-y-2.5">
            {today.slice(0, 4).map((period, idx) => (
              <Card key={period.id ?? `${period.startTime}-${idx}`} variant="default">
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
                      {period.startTime} – {period.endTime}
                    </AppText>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <Card variant="outlined">
            <View className="items-center py-4">
              <Sparkles size={24} color={inkMuted} />
              <AppText variant="body" style={{ color: inkMuted, textAlign: "center", marginTop: 6 }}>
                No published periods today.
              </AppText>
            </View>
          </Card>
        )}
      </View>

      <View>
        <SectionHeader title="Quick links" />
        <View className="gap-y-3">
          {[
            { route: "/homework", title: "My homework", caption: "View assigned work", icon: BookOpenCheck, color: "#7C3AED" },
            { route: "/report-card", title: "Report card", caption: "Published term only", icon: FileText, color: "#2563EB" },
            { route: "/marks", title: "Exam results", caption: "Published scores", icon: Award, color: "#EA580C" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Pressable key={item.route} onPress={() => router.push(item.route as never)} className="active:opacity-80">
                <Card variant="default">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-x-3.5 flex-1">
                      <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: `${item.color}16` }}>
                        <Icon size={24} color={item.color} />
                      </View>
                      <View className="flex-1">
                        <AppText variant="title" style={{ fontSize: 16, fontWeight: "700" }}>
                          {item.title}
                        </AppText>
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
    </View>
  );
}
