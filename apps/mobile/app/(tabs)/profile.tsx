import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useBranding } from "../../features/branding/branding-provider";
import { api } from "../../services/api";
import { clearActiveRole, clearTokens, setActiveRole as persistActiveRole } from "../../services/storage";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";

export default function Profile() {
  const { theme, acl, setAcl, activeRole, setActiveRole } = useBranding();
  const router = useRouter();
  return (
    <View className="flex-1 px-6 pt-16" style={{ backgroundColor: theme.colors.background }}>
      <AppText variant="title" color={theme.colors.primary}>
        Profile
      </AppText>
      <AppText variant="caption" style={{ marginTop: 8 }}>
        Roles: {acl?.roles.join(", ")}
      </AppText>
      {activeRole ? (
        <AppText variant="label" style={{ marginTop: 4 }}>
          Active Role: {activeRole}
        </AppText>
      ) : null}
      {acl && acl.roles.length > 1 ? (
        <View className="mt-6">
          <AppText variant="caption" style={{ marginBottom: 8, fontWeight: "600" }}>
            Switch Role:
          </AppText>
          <View className="flex-row gap-2">
            {acl.roles.map((r) => (
              <Pressable
                key={r}
                onPress={async () => {
                  setActiveRole(r);
                  await persistActiveRole(r);
                }}
                className={`px-3 py-1.5 rounded-full border ${
                  activeRole === r ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
                }`}
              >
                <AppText
                  variant="caption"
                  style={{
                    color: activeRole === r ? "white" : theme.colors.ink,
                    fontWeight: "600",
                  }}
                >
                  {r}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      <View className="mt-8">
        <AppButton
          label="Logout"
          variant="danger"
          onPress={async () => {
            try {
              await (await api()).auth.logout();
            } catch {
              /* revoke best-effort */
            }
            await clearTokens();
            await clearActiveRole();
            setAcl(null);
            setActiveRole(null);
            router.replace("/role-select");
          }}
        />
      </View>
    </View>
  );
}
