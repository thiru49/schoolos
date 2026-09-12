import { View } from "react-native";
import { useRouter } from "expo-router";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { EmptyState } from "../../components/states/Feedback";

export default function Academics() {
  const { theme, acl, selectedChild } = useBranding();
  const router = useRouter();
  const isParent = acl?.roles.includes("parent");
  return (
    <View className="flex-1 px-6 pt-16" style={{ backgroundColor: theme.colors.background }}>
      <AppText variant="title" color={theme.colors.primary}>
        Academics
      </AppText>
      {isParent && selectedChild ? (
        <AppText variant="caption" style={{ marginTop: 4 }}>
          {selectedChild.fullName}
        </AppText>
      ) : null}
      <View className="mt-6">
        <AppButton label="Attendance" onPress={() => router.push("/attendance")} />
      </View>
      <View className="mt-3">
        <AppButton label="Homework" variant="secondary" onPress={() => router.push("/homework")} />
      </View>
      <View className="mt-6">
        <EmptyState title="Timetable and marks" detail="These modules are not built yet." />
      </View>
    </View>
  );
}
