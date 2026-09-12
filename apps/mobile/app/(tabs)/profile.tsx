import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useBranding } from "../../features/branding/branding-provider";
import { clearTokens } from "../../services/storage";

export default function Profile() {
  const { theme, acl, setAcl } = useBranding();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 24, paddingTop: 64 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.colors.primary }}>Profile</Text>
      <Text style={{ marginTop: 8 }}>{acl?.roles.join(", ")}</Text>
      <Pressable
        onPress={async () => {
          await clearTokens();
          setAcl(null);
          router.replace("/role-select");
        }}
        style={{ marginTop: 24 }}
      >
        <Text style={{ color: theme.colors.danger }}>Logout</Text>
      </Pressable>
    </View>
  );
}
