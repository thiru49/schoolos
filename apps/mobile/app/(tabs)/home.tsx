import { View } from "react-native";
import { useRouter } from "expo-router";
import { PERMISSIONS } from "@schoolos/permissions";
import { useBranding } from "../../features/branding/branding-provider";
import { ChildSwitcher } from "../../features/parent/child-switcher";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";

export default function Home() {
  const { branding, theme, acl, selectedChild } = useBranding();
  const router = useRouter();
  const canMark = acl?.permissions.includes(PERMISSIONS.ATTENDANCE_MARK);
  const isParent = acl?.roles.includes("parent");

  return (
    <View className="flex-1 px-6 pt-16" style={{ backgroundColor: theme.colors.background }}>
      <AppText variant="caption" color={theme.colors.primary}>
        {branding?.schoolName}
      </AppText>
      <AppText variant="title" style={{ marginTop: 4 }}>
        {isParent ? "Today" : `Hi ${acl?.roles[0] ?? ""}`}
      </AppText>
      {isParent ? (
        <View className="mt-4">
          <ChildSwitcher />
          <View className="mt-4 rounded-2xl bg-white p-4">
            <AppText variant="label">Attendance</AppText>
            <AppText variant="caption">
              {selectedChild ? `${selectedChild.fullName} · ${selectedChild.className}-${selectedChild.sectionName}` : "Select a child"}
            </AppText>
          </View>
        </View>
      ) : null}
      <View className="mt-6">
        <AppButton
          label={canMark ? "Mark attendance" : "View attendance"}
          onPress={() => router.push("/attendance")}
        />
      </View>
    </View>
  );
}
