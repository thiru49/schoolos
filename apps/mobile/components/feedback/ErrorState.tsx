import React from "react";
import { View, type ViewStyle } from "react-native";
import { AlertCircle } from "lucide-react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "../ui/AppText";
import { AppButton } from "../ui/AppButton";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  style,
}: ErrorStateProps) {
  const { theme } = useBranding();

  return (
    <View
      className="items-center justify-center p-8 bg-white rounded-3xl border border-red-100 shadow-sm"
      style={style}
    >
      <View
        className="w-16 h-16 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: `${theme.colors.danger}15` }}
      >
        <AlertCircle size={32} color={theme.colors.danger} />
      </View>
      <AppText
        variant="title"
        color={theme.colors.danger}
        style={{ fontSize: 18, fontWeight: "700", textAlign: "center" }}
      >
        {title}
      </AppText>
      <AppText
        variant="body"
        style={{ marginTop: 8, textAlign: "center", color: "#64748B", lineHeight: 22 }}
      >
        {message}
      </AppText>
      {onRetry ? (
        <View className="mt-6 w-full max-w-xs">
          <AppButton label="Try Again" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
