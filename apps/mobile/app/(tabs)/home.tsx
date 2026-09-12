import { View } from "react-native";
import { useRouter } from "expo-router";
import { PERMISSIONS } from "@schoolos/permissions";
import { useBranding } from "../../features/branding/branding-provider";
import { ParentHome } from "../../features/parent/parent-home";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";

export default function Home() {
  const { branding, theme, acl } = useBranding();
  const router = useRouter();
  const canMark = acl?.permissions.includes(PERMISSIONS.ATTENDANCE_MARK);
  const isParent = acl?.roles.includes("parent");

  if (isParent) return <ParentHome />;

  return (
    <View className="flex-1 px-6 pt-16" style={{ backgroundColor: theme.colors.background }}>
      <AppText variant="caption" color={theme.colors.primary}>
        {branding?.schoolName}
      </AppText>
      <AppText variant="title" style={{ marginTop: 4 }}>
        Hi {acl?.roles[0] ?? ""}
      </AppText>
      <View className="mt-6">
        <AppButton
          label={canMark ? "Mark attendance" : "View attendance"}
          onPress={() => router.push("/attendance")}
        />
      </View>
    </View>
  );
}
