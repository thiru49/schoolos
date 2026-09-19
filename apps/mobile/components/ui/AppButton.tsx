import React, { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  View,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "./AppText";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "destructive"
  | "danger"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

export interface AppButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: ViewStyle | ((state: { pressed: boolean }) => ViewStyle);
}

export function AppButton({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: AppButtonProps) {
  const { theme } = useBranding();

  const isDestructive = variant === "destructive" || variant === "danger";

  let bg = theme.colors.primary;
  let fg = "#FFFFFF";
  let border = "transparent";

  if (variant === "secondary") {
    bg = "#F1F5F9";
    fg = theme.colors.ink;
    border = "#E2E8F0";
  } else if (variant === "outline") {
    bg = "transparent";
    fg = theme.colors.primary;
    border = theme.colors.primary;
  } else if (isDestructive) {
    bg = theme.colors.danger;
    fg = "#FFFFFF";
    border = theme.colors.danger;
  } else if (variant === "ghost") {
    bg = "transparent";
    fg = theme.colors.primary;
    border = "transparent";
  }

  const minHeight = size === "sm" ? 38 : size === "lg" ? 54 : 48;
  const paddingH = size === "sm" ? 14 : size === "lg" ? 22 : 18;
  const fontSize = size === "sm" ? 14 : size === "lg" ? 17 : 16;
  const borderRadius = size === "sm" ? 10 : 14;

  const isDisabled = loading || disabled;

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      accessibilityRole="button"
      style={(state) => [
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === "outline" ? 1.5 : variant === "secondary" ? 1 : 0,
          borderRadius,
          paddingHorizontal: paddingH,
          minHeight,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          opacity: isDisabled ? 0.55 : state.pressed ? 0.88 : 1,
          shadowColor: variant === "primary" ? theme.colors.primary : "transparent",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: variant === "primary" ? 0.2 : 0,
          shadowRadius: 4,
          elevation: variant === "primary" ? 2 : 0,
        },
        typeof props.style === "function" ? props.style(state) : props.style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {leftIcon}
          <AppText
            style={{
              color: fg,
              fontWeight: "700",
              fontSize,
              letterSpacing: -0.2,
            }}
          >
            {label}
          </AppText>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}
