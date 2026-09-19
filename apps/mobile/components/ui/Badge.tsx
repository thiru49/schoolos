import React from "react";
import { View, type ViewStyle } from "react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "./AppText";

export type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "primary"
  | "accent";

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  style?: ViewStyle;
}

export function Badge({
  label,
  variant = "neutral",
  size = "sm",
  style,
}: BadgeProps) {
  const { theme } = useBranding();

  let bg = "#F1F5F9";
  let fg = "#475569";
  let border = "#E2E8F0";

  switch (variant) {
    case "success":
      bg = "#DCFCE7";
      fg = theme.colors.success;
      border = "#86EFAC";
      break;
    case "warning":
      bg = "#FEF3C7";
      fg = theme.colors.warning;
      border = "#FCD34D";
      break;
    case "danger":
      bg = "#FEE2E2";
      fg = theme.colors.danger;
      border = "#FCA5A5";
      break;
    case "info":
      bg = "#E0F2FE";
      fg = "#0284C7";
      border = "#BAE6FD";
      break;
    case "primary":
      bg = `${theme.colors.primary}18`;
      fg = theme.colors.primary;
      border = `${theme.colors.primary}35`;
      break;
    case "accent":
      bg = `${theme.colors.accent}20`;
      fg = theme.colors.accent;
      border = `${theme.colors.accent}40`;
      break;
  }

  const isSm = size === "sm";

  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1,
          borderRadius: 9999,
          paddingHorizontal: isSm ? 8 : 10,
          paddingVertical: isSm ? 2 : 4,
          alignSelf: "flex-start",
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <AppText
        variant="caption"
        style={{
          color: fg,
          fontWeight: "700",
          fontSize: isSm ? 11 : 12,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}
