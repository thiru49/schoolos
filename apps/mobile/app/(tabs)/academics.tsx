import React from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarCheck,
  Clock,
  BookOpenCheck,
  Award,
  FileText,
  CreditCard,
  ChevronRight,
  GraduationCap,
} from "lucide-react-native";
import type { RoleCode } from "@schoolos/types";
import { useBranding } from "../../features/branding/branding-provider";
import { resolveMobileHomeRole } from "../../features/home/home-policy";
import {
  Screen,
  ScreenHeader,
  SectionHeader,
  Card,
  Badge,
  type BadgeVariant,
} from "../../components/ui";
import { AppText } from "../../components/ui/AppText";

interface AcademicModule {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  icon: typeof CalendarCheck;
  accent: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
}

export default function Academics() {
  const { theme, acl, activeRole, selectedChild } = useBranding();
  const router = useRouter();

  const currentRole = resolveMobileHomeRole(activeRole, acl?.roles);

  // Role-specific filtered module definitions
  const teacherModules: AcademicModule[] = [
    {
      id: "attendance",
      title: "Attendance Roster",
      subtitle: "Mark daily student attendance for your assigned section",
      route: "/attendance",
      icon: CalendarCheck,
      accent: "#059669",
      badge: "Daily Task",
      badgeVariant: "success",
    },
    {
      id: "timetable",
      title: "Class Timetable",
      subtitle: "Weekly schedule, teaching periods, and room allocations",
      route: "/timetable",
      icon: Clock,
      accent: "#0284C7",
    },
    {
      id: "homework",
      title: "Homework Manager",
      subtitle: "Assign new homework tasks and review completion status",
      route: "/homework",
      icon: BookOpenCheck,
      accent: "#7C3AED",
    },
    {
      id: "marks",
      title: "Marks Entry",
      subtitle: "Record draft exam marks and submit subject scorecards",
      route: "/marks",
      icon: Award,
      accent: "#EA580C",
    },
  ];

  const parentModules: AcademicModule[] = [
    {
      id: "attendance",
      title: "Attendance Record",
      subtitle: "Review your child's monthly and daily attendance history",
      route: "/attendance",
      icon: CalendarCheck,
      accent: "#059669",
    },
    {
      id: "timetable",
      title: "Class Timetable",
      subtitle: "Daily class schedule, subjects, and period timings",
      route: "/timetable",
      icon: Clock,
      accent: "#0284C7",
    },
    {
      id: "homework",
      title: "Homework Tracker",
      subtitle: "Daily homework assignments, due dates, and completion status",
      route: "/homework",
      icon: BookOpenCheck,
      accent: "#7C3AED",
    },
    {
      id: "marks",
      title: "Exam Results",
      subtitle: "Official published exam scores and subject marks",
      route: "/marks",
      icon: Award,
      accent: "#EA580C",
    },
    {
      id: "report-card",
      title: "Report Cards",
      subtitle: "Published term performance summaries and downloadable cards",
      route: "/report-card",
      icon: FileText,
      accent: "#2563EB",
      badge: "Official",
      badgeVariant: "info",
    },
    {
      id: "fees",
      title: "Fees & Receipts",
      subtitle: "Term fee invoices, paid history, and verified receipts",
      route: "/fees",
      icon: CreditCard,
      accent: "#0D9488",
    },
  ];

  const studentModules: AcademicModule[] = [
    {
      id: "timetable",
      title: "Today's Schedule",
      subtitle: "Period-by-period class timetable and subjects",
      route: "/timetable",
      icon: Clock,
      accent: "#0284C7",
    },
    {
      id: "homework",
      title: "My Homework",
      subtitle: "Assigned tasks, homework instructions, and completion marks",
      route: "/homework",
      icon: BookOpenCheck,
      accent: "#7C3AED",
    },
    {
      id: "attendance",
      title: "My Attendance",
      subtitle: "Personal attendance record and present percentage",
      route: "/attendance",
      icon: CalendarCheck,
      accent: "#059669",
    },
    {
      id: "marks",
      title: "Exam Results",
      subtitle: "Published exam marks and subject grades",
      route: "/marks",
      icon: Award,
      accent: "#EA580C",
    },
    {
      id: "report-card",
      title: "Term Report Card",
      subtitle: "View published report cards and academic summaries",
      route: "/report-card",
      icon: FileText,
      accent: "#2563EB",
    },
  ];

  const defaultAdminModules: AcademicModule[] = [
    {
      id: "attendance",
      title: "Attendance Roster",
      subtitle: "School-wide attendance records",
      route: "/attendance",
      icon: CalendarCheck,
      accent: "#059669",
    },
    {
      id: "timetable",
      title: "Master Timetable",
      subtitle: "Published class and period schedules",
      route: "/timetable",
      icon: Clock,
      accent: "#0284C7",
    },
    {
      id: "fees",
      title: "Fee Management",
      subtitle: "Collection history, dues, and receipts",
      route: "/fees",
      icon: CreditCard,
      accent: "#0D9488",
    },
  ];

  const modules =
    currentRole === "teacher"
      ? teacherModules
      : currentRole === "parent"
      ? parentModules
      : currentRole === "student"
      ? studentModules
      : defaultAdminModules;

  return (
    <Screen scrollable={true}>
      <View className="px-6 pt-10 pb-8">
        {/* Screen Header */}
        <View className="mb-6">
          <View className="flex-row items-center gap-x-2 mb-1">
            <Badge
              label={currentRole ? currentRole.toUpperCase() : "ACADEMICS"}
              variant="neutral"
            />
            {currentRole === "parent" && selectedChild ? (
              <Badge label={selectedChild.fullName} variant="info" />
            ) : null}
          </View>
          <AppText
            variant="display"
            color={theme.colors.primary}
            style={{ fontSize: 28, fontWeight: "800" }}
          >
            Academics Hub
          </AppText>
          <AppText
            variant="body"
            style={{ marginTop: 4, color: "#475569", fontSize: 15 }}
          >
            {currentRole === "teacher"
              ? "Instructional tools, attendance marking, and grading."
              : currentRole === "parent"
              ? "Academic progress, schedules, and fee records for your ward."
              : currentRole === "student"
              ? "Your daily classes, homework assignments, and results."
              : "Academic operations and monitoring."}
          </AppText>
        </View>

        {/* Modules List */}
        <View className="gap-y-3.5">
          {modules.map((mod) => {
            const IconComponent = mod.icon;
            return (
              <Pressable
                key={mod.id}
                onPress={() => router.push(mod.route as any)}
                className="active:opacity-80"
              >
                <Card variant="default">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-x-3.5 flex-1 pr-3">
                      <View
                        className="w-12 h-12 rounded-2xl items-center justify-center shadow-sm"
                        style={{ backgroundColor: `${mod.accent}16` }}
                      >
                        <IconComponent size={24} color={mod.accent} />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-x-2 mb-1">
                          <AppText
                            variant="title"
                            style={{ fontSize: 16, fontWeight: "700", color: "#1E293B" }}
                          >
                            {mod.title}
                          </AppText>
                          {mod.badge ? (
                            <Badge
                              label={mod.badge}
                              variant={mod.badgeVariant ?? "neutral"}
                            />
                          ) : null}
                        </View>
                        <AppText
                          variant="caption"
                          style={{ color: "#64748B", fontSize: 13 }}
                          numberOfLines={2}
                        >
                          {mod.subtitle}
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
    </Screen>
  );
}
