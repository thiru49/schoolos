import React from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "./AppText";

export type AttendanceStatusCode = "P" | "A" | "L" | "H" | string;

const LABELS: Record<string, string> = {
  P: "Present",
  A: "Absent",
  L: "Late",
  H: "Holiday",
};

const TAMIL_LABELS: Record<string, string> = {
  P: "வந்தார்",
  A: "வரவில்லை",
  L: "தாமதம்",
  H: "விடுமுறை",
};

export interface StatusChipProps {
  status: AttendanceStatusCode;
  selected?: boolean;
  onPress?: () => void;
  compact?: boolean;
  showTamil?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function StatusChip({
  status,
  selected = false,
  onPress,
  compact = false,
  showTamil = false,
  disabled = false,
  style,
}: StatusChipProps) {
  const { theme } = useBranding();

  let activeColor = theme.colors.primary;
  let activeBorder = theme.colors.primary;
  let activeBg = theme.colors.primary;

  switch (status) {
    case "P":
      activeColor = theme.colors.success;
      activeBorder = theme.colors.success;
      activeBg = theme.colors.success;
      break;
    case "A":
      activeColor = theme.colors.danger;
      activeBorder = theme.colors.danger;
      activeBg = theme.colors.danger;
      break;
    case "L":
      activeColor = theme.colors.warning;
      activeBorder = theme.colors.warning;
      activeBg = theme.colors.warning;
      break;
    case "H":
      activeColor = "#64748B";
      activeBorder = "#64748B";
      activeBg = "#64748B";
      break;
  }

  const bg = selected ? activeBg : "#F1F5F9";
  const fg = selected ? "#FFFFFF" : "#334155";
  const border = selected ? activeBorder : "#CBD5E1";

  const content = (
    <View
      style={[
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1.5,
          borderRadius: compact ? 10 : 9999,
          paddingHorizontal: compact ? 10 : 14,
          paddingVertical: compact ? 6 : 8,
          minWidth: compact ? 36 : 48,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <AppText
        variant="label"
        style={{
          color: fg,
          fontWeight: "700",
          fontSize: compact ? 13 : 14,
        }}
      >
        {compact ? status : LABELS[status] ?? status}
      </AppText>
      {showTamil && !compact && TAMIL_LABELS[status] ? (
        <AppText
          variant="caption"
          style={{
            color: selected ? "#FFFFFFDD" : "#64748B",
            fontSize: 10,
            marginTop: 1,
          }}
        >
          {TAMIL_LABELS[status]}
        </AppText>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
