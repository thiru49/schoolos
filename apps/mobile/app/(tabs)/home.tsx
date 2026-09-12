import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { PERMISSIONS } from "@schoolos/permissions";
import { useBranding } from "../../features/branding/branding-provider";

export default function Home() {
  const { branding, theme, acl } = useBranding();
  const router = useRouter();
  const canMark = acl?.permissions.includes(PERMISSIONS.ATTENDANCE_MARK);
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 24, paddingTop: 64 }}>
      <Text style={{ color: theme.colors.primary, fontSize: 22, fontWeight: "700" }}>
        {branding?.schoolName}
      </Text>
      <Text style={{ marginTop: 8 }}>Welcome</Text>
      {canMark ? (
        <Pressable
          onPress={() => router.push("/attendance")}
          style={{ marginTop: 24, backgroundColor: theme.colors.primary, padding: 16, borderRadius: 12 }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Mark attendance</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push("/attendance")}
          style={{ marginTop: 24, backgroundColor: "white", padding: 16, borderRadius: 12 }}
        >
          <Text>View attendance</Text>
        </Pressable>
      )}
    </View>
  );
}
