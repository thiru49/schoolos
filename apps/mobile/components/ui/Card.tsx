import React, { type ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "default" | "elevated" | "outlined" | "tinted";
  tintColor?: string;
  leftAccentColor?: string;
  disabled?: boolean;
}

export function Card({
  children,
  onPress,
  style,
  padding = "md",
  variant = "default",
  tintColor,
  leftAccentColor,
  disabled = false,
}: CardProps) {
  const paddingClass =
    padding === "none"
      ? ""
      : padding === "sm"
      ? "p-3"
      : padding === "lg"
      ? "p-5"
      : "p-4";

  const baseStyle: ViewStyle = {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: tintColor ?? "#FFFFFF",
    borderColor: variant === "outlined" ? "#CBD5E1" : "#E2E8F0",
    borderWidth: 1,
  };

  const shadowStyle: ViewStyle =
    variant === "elevated" || variant === "default"
      ? {
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }
      : {};

  const content = (
    <View style={{ flex: 1, flexDirection: "row" }}>
      {leftAccentColor ? (
        <View
          style={{
            width: 4,
            backgroundColor: leftAccentColor,
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
          }}
        />
      ) : null}
      <View className={`flex-1 ${paddingClass}`}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        style={({ pressed }) => [
          baseStyle,
          shadowStyle,
          { opacity: disabled ? 0.6 : pressed ? 0.92 : 1 },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[baseStyle, shadowStyle, style]}>
      {content}
    </View>
  );
}
