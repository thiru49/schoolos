import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useBranding } from "../../features/branding/branding-provider";
import {
  buildSessionCacheContext,
  clearTenantSelection,
} from "../../features/tenant/tenant-session";
import { AppText } from "./AppText";

export function ChangeSchoolLink() {
  const router = useRouter();
  const { theme, acl, activeRole, selectedChild, setBranding, setAcl, setActiveRole, setSelectedChild } =
    useBranding();

  return (
    <Pressable
      onPress={() => {
        void (async () => {
          await clearTenantSelection({
            setBranding,
            setAcl,
            setActiveRole,
            setSelectedChild,
            cacheContext: buildSessionCacheContext(acl, activeRole, selectedChild),
          });
          router.replace("/school-select");
        })();
      }}
      className="mt-6 items-center py-2"
    >
      <AppText variant="caption" color={theme.colors.primary} style={{ fontWeight: "600" }}>
        Change school
      </AppText>
    </Pressable>
  );
}
