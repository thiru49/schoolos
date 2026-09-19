import React from "react";
import { ActivityIndicator, View, type ViewStyle } from "react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "../ui/AppText";

export interface LoadingStateProps {
  message?: string;
  style?: ViewStyle;
}

export function LoadingState({
  message = "Loading…",
  style,
}: LoadingStateProps) {
  const { theme } = useBranding();

  return (
    <View
      className="items-center justify-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm"
      style={style}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <AppText
        variant="body"
        style={{ marginTop: 14, color: "#64748B", fontWeight: "600" }}
      >
        {message}
      </AppText>
    </View>
  );
}
