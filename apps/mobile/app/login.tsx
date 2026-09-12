import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { RoleCode } from "@schoolos/types";
import { api } from "../services/api";
import { getSlug, setTokens } from "../services/storage";
import { useBranding } from "../features/branding/branding-provider";
import { AppText } from "../components/ui/AppText";
import { AppInput } from "../components/ui/AppInput";
import { AppButton } from "../components/ui/AppButton";

export default function Login() {
  const { role } = useLocalSearchParams<{ role: RoleCode }>();
  const router = useRouter();
  const { branding, theme, setAcl } = useBranding();
  const [identifier, setIdentifier] = useState(
    role === "teacher" ? "TCH-8A" : role === "parent" ? "9000000001" : "AN2021-0001",
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const slug = await getSlug();
      const client = await api();
      const res = await client.auth.login({ slug, roleHint: role, identifier, password });
      await setTokens(res.accessToken, res.refreshToken);
      setAcl(await (await api()).me.acl());
      router.replace("/(tabs)/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 justify-center px-6" style={{ backgroundColor: theme.colors.background }}>
      <AppText variant="title" color={theme.colors.primary}>
        {branding?.schoolName ?? "School"}
      </AppText>
      <AppText variant="caption" style={{ marginTop: 4 }}>
        Role: {role}
      </AppText>
      <AppInput
        className="mt-4"
        placeholder="Admission / Employee ID"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
      />
      <AppInput className="mt-3" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {error ? (
        <AppText variant="caption" color={theme.colors.danger} style={{ marginTop: 8 }}>
          {error}
        </AppText>
      ) : null}
      <View className="mt-5">
        <AppButton label={loading ? "Signing in…" : "Sign in"} loading={loading} onPress={() => void submit()} />
      </View>
    </View>
  );
}
