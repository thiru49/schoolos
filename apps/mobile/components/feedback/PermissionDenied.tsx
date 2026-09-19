import React from "react";
import { View, type ViewStyle } from "react-native";
import { ShieldAlert } from "lucide-react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "../ui/AppText";
import { AppButton } from "../ui/AppButton";

export interface PermissionDeniedProps {
  title?: string;
  detail?: string;
  onBack?: () => void;
  style?: ViewStyle;
}

export function PermissionDenied({
  title = "Access Restricted",
  detail = "You do not have permission to access this module.",
  onBack,
  style,
}: PermissionDeniedProps) {
  const { theme } = useBranding();

  return (
    <View
      className="items-center justify-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm"
      style={style}
    >
      <View
        className="w-16 h-16 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: `${theme.colors.primary}15` }}
      >
        <ShieldAlert size={32} color={theme.colors.primary} />
      </View>
      <AppText
        variant="title"
        color={theme.colors.primary}
        style={{ fontSize: 18, fontWeight: "700", textAlign: "center" }}
      >
        {title}
      </AppText>
      <AppText
        variant="body"
        style={{ marginTop: 8, textAlign: "center", color: "#64748B", lineHeight: 22 }}
      >
        {detail}
      </AppText>
      {onBack ? (
        <View className="mt-6 w-full max-w-xs">
          <AppButton label="Go Back" variant="secondary" onPress={onBack} />
        </View>
      ) : null}
    </View>
  );
}
