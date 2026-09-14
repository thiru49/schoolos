import { Pressable, View } from "react-native";
import { AppText } from "../../components/ui/AppText";
import { EmptyState } from "../../components/states/Feedback";
import { useBranding } from "../branding/branding-provider";
import type { MobileNotificationItem } from "./communications-types";

export function AlertsFeed({
  notifications,
  onMarkRead,
}: {
  notifications: MobileNotificationItem[];
  onMarkRead: (id: string) => Promise<void>;
}) {
  const { theme } = useBranding();

  if (notifications.length === 0) {
    return (
      <EmptyState
        title="No alerts yet"
        detail="Absence alerts for linked children will appear here."
      />
    );
  }

  return (
    <View className="gap-3">
      {notifications.map((n) => (
        <Pressable
          key={n.id}
          className="rounded-2xl bg-white p-4 shadow-sm"
          onPress={() => {
            if (!n.read) void onMarkRead(n.id);
          }}
        >
          <View className="flex-row items-center justify-between">
            <AppText variant="label" color={theme.colors.ink} style={{ fontSize: 16, flex: 1 }}>
              {n.title}
            </AppText>
            <View
              className="ml-2 rounded-full px-2 py-0.5"
              style={{
                backgroundColor: n.read ? "#f1f5f9" : "#fee2e2",
              }}
            >
              <AppText
                variant="caption"
                style={{
                  color: n.read ? "#64748b" : "#b91c1c",
                  fontWeight: "600",
                }}
              >
                {n.read ? "Read" : "New"}
              </AppText>
            </View>
          </View>
          <AppText variant="caption" color="#475569" style={{ marginTop: 6 }}>
            {n.body}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
