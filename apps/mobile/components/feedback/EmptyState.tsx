import React, { type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { Inbox } from "lucide-react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "../ui/AppText";
import { AppButton } from "../ui/AppButton";

export interface EmptyStateProps {
  title: string;
  detail?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  title,
  detail,
  icon,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const { theme } = useBranding();

  return (
    <View
      className="items-center justify-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm"
      style={style}
    >
      <View
        className="w-16 h-16 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: `${theme.colors.primary}12` }}
      >
        {icon ?? <Inbox size={30} color={theme.colors.primary} />}
      </View>
      <AppText
        variant="title"
        style={{ fontSize: 18, fontWeight: "700", textAlign: "center", color: "#1E293B" }}
      >
        {title}
      </AppText>
      {detail ? (
        <AppText
          variant="body"
          style={{ marginTop: 8, textAlign: "center", color: "#64748B", lineHeight: 22 }}
        >
          {detail}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <View className="mt-6 w-full max-w-xs">
          <AppButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
