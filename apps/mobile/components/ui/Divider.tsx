import React from "react";
import { View, type ViewStyle } from "react-native";
import { AppText } from "./AppText";

export interface DividerProps {
  label?: string;
  marginVertical?: number;
  style?: ViewStyle;
}

export function Divider({
  label,
  marginVertical = 16,
  style,
}: DividerProps) {
  if (label) {
    return (
      <View
        className="flex-row items-center w-full"
        style={[{ marginVertical }, style]}
      >
        <View className="flex-1 h-[1px] bg-slate-200" />
        <AppText
          variant="caption"
          style={{ paddingHorizontal: 12, color: "#94A3B8", fontWeight: "600" }}
        >
          {label}
        </AppText>
        <View className="flex-1 h-[1px] bg-slate-200" />
      </View>
    );
  }

  return (
    <View
      className="w-full h-[1px] bg-slate-200"
      style={[{ marginVertical }, style]}
    />
  );
}
