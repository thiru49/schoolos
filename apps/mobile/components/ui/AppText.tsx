import { Text, type TextProps } from "react-native";
import { useBranding } from "../../features/branding/branding-provider";

const VARIANTS = {
  display: { size: "display" as const, weight: "700" },
  title: { size: "xl" as const, weight: "600" },
  body: { size: "md" as const, weight: "400" },
  caption: { size: "xs" as const, weight: "400" },
  label: { size: "sm" as const, weight: "500" },
};

export function AppText({
  variant = "body",
  color,
  style,
  ...props
}: TextProps & { variant?: keyof typeof VARIANTS; color?: string }) {
  const { theme } = useBranding();
  const v = VARIANTS[variant];
  return (
    <Text
      style={[
        {
          fontSize: theme.typography.scale[v.size],
          fontWeight: v.weight as "400" | "500" | "600" | "700",
          color: color ?? theme.colors.ink,
        },
        style,
      ]}
      {...props}
    />
  );
}
