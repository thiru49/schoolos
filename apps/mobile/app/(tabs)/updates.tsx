import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { api } from "../../services/api";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { EmptyState, ErrorState } from "../../components/states/Feedback";

type Item = { id: string; title: string; body: string; read: boolean; createdAt: string };

export default function Updates() {
  const { theme } = useBranding();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await (await api()).notifications.list());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load updates");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View className="flex-1 px-6 pt-16" style={{ backgroundColor: theme.colors.background }}>
      <AppText variant="title" color={theme.colors.primary}>
        Updates
      </AppText>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!error && items.length === 0 ? (
        <View className="mt-6">
          <EmptyState title="No updates yet" detail="Absence alerts for linked children will appear here." />
        </View>
      ) : null}
      <ScrollView className="mt-4">
        {items.map((n) => (
          <Pressable
            key={n.id}
            className="mb-2 rounded-2xl bg-white p-4"
            onPress={() => {
              if (!n.read) void (async () => {
                await (await api()).notifications.markRead(n.id);
                await load();
              })();
            }}
          >
            <AppText variant="label">{n.title}</AppText>
            <AppText variant="caption">{n.body}</AppText>
            <AppText variant="caption">{n.read ? "Read" : "New"}</AppText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
