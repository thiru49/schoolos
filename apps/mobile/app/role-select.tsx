import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useBranding } from "../features/branding/branding-provider";
import { ChangeSchoolLink } from "../components/ui/ChangeSchoolLink";
import { AppText } from "../components/ui/AppText";

const ROLES = [
  { id: "student", label: "Student", ta: "மாணவர்" },
  { id: "parent", label: "Parent", ta: "பெற்றோர்" },
  { id: "teacher", label: "Teacher", ta: "ஆசிரியர்" },
] as const;

export default function RoleSelect() {
  const router = useRouter();
  const { branding, theme } = useBranding();
  return (
    <View className="flex-1 justify-center px-6" style={{ backgroundColor: theme.colors.background }}>
      <AppText variant="title" color={theme.colors.primary}>
        {branding?.schoolName ?? "School"}
      </AppText>
      <AppText variant="body" style={{ marginTop: 8 }}>
        Choose your role to continue
      </AppText>
      {ROLES.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => router.push({ pathname: "/login", params: { role: r.id } })}
          className="mt-3 rounded-2xl bg-white p-4"
        >
          <AppText variant="label">{r.label}</AppText>
          <AppText variant="caption">{r.ta}</AppText>
        </Pressable>
      ))}
      <ChangeSchoolLink />
    </View>
  );
}
