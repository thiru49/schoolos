import React from "react";
import { Image, View, type ViewStyle } from "react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "./AppText";

export interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  role?: "student" | "parent" | "teacher" | string;
  style?: ViewStyle;
}

const SIZES = {
  sm: { diameter: 32, fontSize: 12, border: 1.5 },
  md: { diameter: 42, fontSize: 15, border: 2 },
  lg: { diameter: 54, fontSize: 18, border: 2 },
  xl: { diameter: 72, fontSize: 24, border: 3 },
};

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  imageUrl,
  size = "md",
  role,
  style,
}: AvatarProps) {
  const { theme } = useBranding();
  const conf = SIZES[size];

  return (
    <View
      style={[
        {
          width: conf.diameter,
          height: conf.diameter,
          borderRadius: conf.diameter / 2,
          backgroundColor: `${theme.colors.primary}18`,
          borderWidth: conf.border,
          borderColor: theme.colors.primary,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        },
        style,
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: conf.diameter, height: conf.diameter }}
          resizeMode="cover"
        />
      ) : (
        <AppText
          style={{
            fontSize: conf.fontSize,
            fontWeight: "700",
            color: theme.colors.primary,
          }}
        >
          {getInitials(name)}
        </AppText>
      )}
    </View>
  );
}
