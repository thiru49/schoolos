import React from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarCheck,
  BookOpenCheck,
  Award,
  CreditCard,
  ChevronRight,
  FileText,
} from "lucide-react-native";
import { useBranding } from "../branding/branding-provider";
import { ChildSwitcher } from "../parent/child-switcher";
import { Card, MetricCard, SectionHeader, Avatar, Badge } from "../../components/ui";
import { AppText } from "../../components/ui/AppText";
import { formatAttendanceStatus, formatFeeDues } from "./home-snapshot";

export function ParentHomeDashboard({
  attendanceStatus,
  dues,
}: {
  attendanceStatus: string | null;
  dues: number | null;
}) {
  const { theme, branding, selectedChild } = useBranding();
  const router = useRouter();
  const childLabel = selectedChild
    ? `${selectedChild.className}-${selectedChild.sectionName}`
    : "Select child";

  return (
    <View className="gap-y-6">
      <Card variant="elevated">
        <View className="flex-row items-center gap-x-3.5">
          <Avatar name={selectedChild?.fullName ?? "Parent"} role="parent" size="lg" />
          <View className="flex-1">
            <AppText variant="caption" style={{ color: "#64748B", fontWeight: "600", textTransform: "uppercase", fontSize: 11 }}>
              {branding?.schoolName ?? "Arul Neri Academy"}
            </AppText>
            <AppText variant="title" style={{ fontSize: 18, fontWeight: "800", color: "#1E293B" }} numberOfLines={1}>
              {selectedChild?.fullName ?? "Your child"}
            </AppText>
            <View className="flex-row items-center gap-x-2 mt-1">
              <Badge label={`Parent · ${childLabel}`} variant="info" />
            </View>
          </View>
        </View>
        <View className="mt-4">
          <ChildSwitcher />
        </View>
      </Card>

      <View>
        <SectionHeader title="Today" />
        <View className="flex-row gap-x-3">
          <View className="flex-1">
            <MetricCard
              label="Attendance"
              value={formatAttendanceStatus(attendanceStatus)}
              subtitle={childLabel}
              accentColor="#059669"
              icon={<CalendarCheck size={20} color="#059669" />}
              onPress={() => router.push("/attendance")}
            />
          </View>
          <View className="flex-1">
            <MetricCard
              label="Fees"
              value={formatFeeDues(dues)}
              subtitle={selectedChild?.fullName ?? "Linked child"}
              accentColor="#0D9488"
              icon={<CreditCard size={20} color="#0D9488" />}
              onPress={() => router.push("/fees")}
            />
          </View>
        </View>
      </View>

      <View>
        <SectionHeader title="Look after" />
        <View className="gap-y-3">
          {[
            {
              route: "/attendance",
              title: "Attendance calendar",
              caption: "Month view · Present / Absent / Late / Holiday",
              icon: CalendarCheck,
              color: "#059669",
            },
            {
              route: "/fees",
              title: "Fees & receipts",
              caption: "Dues and official receipts · no collection on mobile",
              icon: CreditCard,
              color: "#0D9488",
            },
            {
              route: "/homework",
              title: "Homework",
              caption: "Due work for this child",
              icon: BookOpenCheck,
              color: "#7C3AED",
            },
            {
              route: "/report-card",
              title: "Report card",
              caption: "Published term card only",
              icon: FileText,
              color: "#2563EB",
            },
            {
              route: "/marks",
              title: "Exam results",
              caption: "Published marks only",
              icon: Award,
              color: "#EA580C",
            },
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
                        <AppText variant="title" style={{ fontSize: 16, fontWeight: "700" }}>
                          {item.title}
                        </AppText>
                        <AppText variant="caption" style={{ color: "#64748B", marginTop: 2 }}>
                          {item.caption}
                        </AppText>
                      </View>
                    </View>
                    <ChevronRight size={20} color="#94A3B8" />
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
