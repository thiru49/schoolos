import React, { type ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "./AppText";

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  accentColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export function MetricCard({
  label,
  value,
  subtitle,
  icon,
  badge,
  accentColor,
  onPress,
  style,
}: MetricCardProps) {
  const { theme } = useBranding();
  const color = accentColor ?? theme.colors.primary;

  const content = (
    <View className="flex-1 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        {icon ? (
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            {icon}
          </View>
        ) : (
          <View />
        )}
        {badge ? <View>{badge}</View> : null}
      </View>
      <AppText
        variant="title"
        color={color}
        style={{ fontSize: 24, fontWeight: "800", letterSpacing: -0.5 }}
      >
        {value}
      </AppText>
      <AppText
        variant="caption"
        style={{ color: "#64748B", fontWeight: "600", marginTop: 2 }}
        numberOfLines={1}
      >
        {label}
      </AppText>
      {subtitle ? (
        <AppText
          variant="caption"
          style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}
          numberOfLines={1}
        >
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.9 : 1 }, style]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[{ flex: 1 }, style]}>{content}</View>;
}
