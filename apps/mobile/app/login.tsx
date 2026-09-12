import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { RoleCode } from "@schoolos/types";
import { api } from "../services/api";
import { getSlug, setTokens } from "../services/storage";
import { useBranding } from "../features/branding/branding-provider";

export default function Login() {
  const { role } = useLocalSearchParams<{ role: RoleCode }>();
  const router = useRouter();
  const { branding, theme, setAcl } = useBranding();
  const [identifier, setIdentifier] = useState(role === "teacher" ? "TCH-8A" : role === "parent" ? "9000000001" : "AN2021-0001");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const slug = await getSlug();
      const client = await api();
      const res = await client.auth.login({
        slug,
        roleHint: role,
        identifier,
        password,
      });
      await setTokens(res.accessToken, res.refreshToken);
      const authed = await api();
      setAcl(await authed.me.acl());
      router.replace("/(tabs)/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.colors.primary }}>
        {branding?.schoolName ?? "School"}
      </Text>
      <Text style={{ marginTop: 4 }}>Role: {role}</Text>
      <TextInput
        placeholder="Admission / Employee ID"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        style={{ marginTop: 16, backgroundColor: "white", borderRadius: 10, padding: 12 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ marginTop: 12, backgroundColor: "white", borderRadius: 10, padding: 12 }}
      />
      {error ? <Text style={{ color: theme.colors.danger, marginTop: 8 }}>{error}</Text> : null}
      <Pressable
        onPress={() => void submit()}
        disabled={loading}
        style={{ marginTop: 20, backgroundColor: theme.colors.primary, padding: 14, borderRadius: 10 }}
      >
        <Text style={{ color: "white", textAlign: "center", fontWeight: "600" }}>
          {loading ? "Signing in…" : "Sign in"}
        </Text>
      </Pressable>
    </View>
  );
}
