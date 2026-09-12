import { Text, type TextProps } from "react-native";
import { useBranding } from "../../features/branding/branding-provider";

const VARIANTS = {
  display: { size: "display" as const, weight: "700" },
  title: { size: "xl" as const, weight: "600" },
  body: { size: "md" as const, weight: "400" },
  caption: { size: "xs" as const, weight: "400" },
  label: { size: "sm" as const, weight: "500" },
};

const TAMIL_RE = /[\u0B80-\u0BFF]/;

function childrenHaveTamil(children: TextProps["children"]): boolean {
  if (typeof children === "string" || typeof children === "number") return TAMIL_RE.test(String(children));
  if (Array.isArray(children)) return children.some((c) => childrenHaveTamil(c as TextProps["children"]));
  return false;
}

export function AppText({
  variant = "body",
  color,
  style,
  children,
  ...props
}: TextProps & { variant?: keyof typeof VARIANTS; color?: string }) {
  const { theme } = useBranding();
  const v = VARIANTS[variant];
  const tamil = childrenHaveTamil(children);
  const size = theme.typography.scale[v.size];
  return (
    <Text
      style={[
        {
          fontSize: size,
          fontWeight: v.weight as "400" | "500" | "600" | "700",
          color: color ?? theme.colors.ink,
          fontFamily: tamil ? theme.typography.families.tamil : theme.typography.families.body,
          lineHeight: tamil ? Math.round(size * 1.8) : undefined,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}
