import React, { type ReactNode } from "react";
import { Pressable, ScrollView, View, type ViewStyle } from "react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "./AppText";

export interface SegmentItem<T extends string = string> {
  id: T;
  label: string;
  icon?: ReactNode;
  badge?: number | string;
}

export interface SegmentedControlProps<T extends string = string> {
  items: SegmentItem<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  scrollable?: boolean;
  style?: ViewStyle;
}

export function SegmentedControl<T extends string = string>({
  items,
  selectedId,
  onSelect,
  scrollable = false,
  style,
}: SegmentedControlProps<T>) {
  const { theme } = useBranding();

  const renderItem = (item: SegmentItem<T>) => {
    const isSelected = item.id === selectedId;

    return (
      <Pressable
        key={item.id}
        onPress={() => onSelect(item.id)}
        accessibilityRole="tab"
        accessibilityState={{ selected: isSelected }}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: scrollable ? 14 : 8,
            flex: scrollable ? undefined : 1,
            borderRadius: 10,
            backgroundColor: isSelected ? theme.colors.primary : "transparent",
            opacity: pressed && !isSelected ? 0.8 : 1,
          },
        ]}
      >
        {item.icon}
        <AppText
          variant="label"
          style={{
            fontSize: 14,
            fontWeight: isSelected ? "700" : "600",
            color: isSelected ? "#FFFFFF" : "#64748B",
          }}
        >
          {item.label}
        </AppText>
        {item.badge != null ? (
          <View
            style={{
              backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : "#E2E8F0",
              borderRadius: 9999,
              paddingHorizontal: 6,
              paddingVertical: 1,
            }}
          >
            <AppText
              variant="caption"
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: isSelected ? "#FFFFFF" : "#475569",
              }}
            >
              {item.badge}
            </AppText>
          </View>
        ) : null}
      </Pressable>
    );
  };

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          backgroundColor: "#F1F5F9",
          borderRadius: 14,
          padding: 4,
          gap: 4,
        }}
        style={style}
      >
        {items.map(renderItem)}
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        {
          flexDirection: "row",
          backgroundColor: "#F1F5F9",
          borderRadius: 14,
          padding: 4,
          gap: 4,
        },
        style,
      ]}
    >
      {items.map(renderItem)}
    </View>
  );
}
