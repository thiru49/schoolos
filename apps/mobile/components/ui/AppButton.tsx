import { ActivityIndicator, Pressable, type PressableProps } from "react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "./AppText";

export function AppButton({
  label,
  variant = "primary",
  loading,
  ...props
}: PressableProps & { label: string; variant?: "primary" | "secondary" | "danger"; loading?: boolean }) {
  const { theme } = useBranding();
  const bg =
    variant === "primary" ? theme.colors.primary : variant === "danger" ? theme.colors.danger : "white";
  const fg = variant === "secondary" ? theme.colors.ink : "white";
  return (
    <Pressable
      {...props}
      disabled={loading || props.disabled}
      className="items-center rounded-xl px-4 py-3"
      style={[{ backgroundColor: bg, opacity: loading || props.disabled ? 0.6 : 1 }, props.style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <AppText style={{ color: fg, fontWeight: "600" }}>{label}</AppText>}
    </Pressable>
  );
}
