import { View } from "react-native";
import { useRouter } from "expo-router";
import { useBranding } from "../../features/branding/branding-provider";
import { clearTokens } from "../../services/storage";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";

export default function Profile() {
  const { theme, acl, setAcl } = useBranding();
  const router = useRouter();
  return (
    <View className="flex-1 px-6 pt-16" style={{ backgroundColor: theme.colors.background }}>
      <AppText variant="title" color={theme.colors.primary}>
        Profile
      </AppText>
      <AppText variant="caption" style={{ marginTop: 8 }}>
        {acl?.roles.join(", ")}
      </AppText>
      <View className="mt-8">
        <AppButton
          label="Logout"
          variant="danger"
          onPress={async () => {
            await clearTokens();
            setAcl(null);
            router.replace("/role-select");
          }}
        />
      </View>
    </View>
  );
}
