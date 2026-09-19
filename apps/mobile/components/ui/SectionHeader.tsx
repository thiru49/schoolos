import React from "react";
import { Pressable, View } from "react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "./AppText";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  count?: number;
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  count,
}: SectionHeaderProps) {
  const { theme } = useBranding();

  return (
    <View className="flex-row items-center justify-between mb-3 px-1">
      <View className="flex-row items-center gap-2 flex-1">
        <AppText
          variant="label"
          style={{ fontSize: 16, fontWeight: "700", color: "#1E293B" }}
        >
          {title}
        </AppText>
        {typeof count === "number" ? (
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: "#E2E8F0" }}
          >
            <AppText
              variant="caption"
              style={{ fontSize: 12, fontWeight: "600", color: "#475569" }}
            >
              {count}
            </AppText>
          </View>
        ) : null}
        {subtitle ? (
          <AppText variant="caption" color="#64748B">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppText
            variant="caption"
            color={theme.colors.primary}
            style={{ fontWeight: "600" }}
          >
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
