import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useBranding } from "../features/branding/branding-provider";

const ROLES = [
  { id: "student", label: "Student" },
  { id: "parent", label: "Parent" },
  { id: "teacher", label: "Teacher" },
] as const;

export default function RoleSelect() {
  const router = useRouter();
  const { branding, theme } = useBranding();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.colors.primary }}>
        {branding?.schoolName ?? "School"}
      </Text>
      <Text style={{ marginTop: 8, color: theme.colors.ink }}>Choose your role</Text>
      {ROLES.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => router.push({ pathname: "/login", params: { role: r.id } })}
          style={{ marginTop: 12, backgroundColor: "white", padding: 16, borderRadius: 12 }}
        >
          <Text style={{ fontWeight: "600" }}>{r.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
