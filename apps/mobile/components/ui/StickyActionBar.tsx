import React, { type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface StickyActionBarProps {
  children: ReactNode;
  style?: ViewStyle;
}

export function StickyActionBar({ children, style }: StickyActionBarProps) {
  return (
    <View
      style={[
        {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
          elevation: 8,
        },
        style,
      ]}
    >
      <SafeAreaView edges={["bottom"]} style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        {children}
      </SafeAreaView>
    </View>
  );
}
