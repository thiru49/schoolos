import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "../../components/ui/AppText";
import { EmptyState } from "../../components/states/Feedback";
import { useBranding } from "../branding/branding-provider";
import { formatAudienceLabel, formatNoticeDate } from "./communications-logic";
import type { MobileNoticeItem } from "./communications-types";

export { formatAudienceLabel, formatNoticeDate };

export function NoticesFeed({ notices }: { notices: MobileNoticeItem[] }) {
  const { theme } = useBranding();
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (notices.length === 0) {
    return (
      <EmptyState
        title="No notices yet"
        detail="Official school announcements will appear here."
      />
    );
  }

  return (
    <View className="gap-3">
      {notices.map((notice) => {
        const isExpanded = Boolean(expandedIds[notice.id]);
        const audience = formatAudienceLabel(notice.targetRole);
        const dateStr = formatNoticeDate(notice.publishedAt || notice.createdAt);

        return (
          <Pressable
            key={notice.id}
            onPress={() => toggleExpand(notice.id)}
            className="rounded-2xl bg-white p-4 shadow-sm"
          >
            <View className="flex-row items-center justify-between">
              <View
                className="rounded-full px-2.5 py-0.5"
                style={{ backgroundColor: audience.bg }}
              >
                <AppText
                  variant="caption"
                  style={{ color: audience.text, fontWeight: "600" }}
                >
                  {audience.label}
                </AppText>
              </View>
              {dateStr ? (
                <AppText variant="caption" color="#94a3b8">
                  {dateStr}
                </AppText>
              ) : null}
            </View>

            <AppText
              variant="label"
              color={theme.colors.ink}
              style={{ marginTop: 8, fontSize: 16 }}
            >
              {notice.title}
            </AppText>

            <AppText
              variant="body"
              color="#475569"
              numberOfLines={isExpanded ? undefined : 3}
              style={{ marginTop: 6 }}
            >
              {notice.body}
            </AppText>

            <View className="mt-3 flex-row items-center justify-between">
              {notice.authorName ? (
                <AppText variant="caption" color="#64748b">
                  By {notice.authorName}
                </AppText>
              ) : (
                <View />
              )}
              {notice.body.length > 120 ? (
                <AppText
                  variant="caption"
                  color={theme.colors.primary}
                  style={{ fontWeight: "600" }}
                >
                  {isExpanded ? "Show less" : "Read more"}
                </AppText>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
