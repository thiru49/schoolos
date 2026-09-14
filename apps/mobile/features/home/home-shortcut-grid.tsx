import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import type { HomeShortcut } from "./home-policy";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";

export function HomeShortcutGrid({
  shortcuts,
  subtitles,
}: {
  shortcuts: HomeShortcut[];
  subtitles?: Partial<Record<string, string>>;
}) {
  const { theme } = useBranding();
  const router = useRouter();

  if (shortcuts.length === 0) {
    return (
      <View className="rounded-2xl bg-white p-4">
        <AppText variant="caption">No modules available for this role.</AppText>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {shortcuts.map((shortcut) => (
        <Pressable
          key={shortcut.id}
          onPress={() => router.push(shortcut.route)}
          className="rounded-2xl bg-white p-4"
        >
          <AppText variant="label">{shortcut.label}</AppText>
          {subtitles?.[shortcut.id] ? (
            <AppText variant="caption" color={theme.colors.primary} style={{ marginTop: 6 }}>
              {subtitles[shortcut.id]}
            </AppText>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
