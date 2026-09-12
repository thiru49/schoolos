import { Pressable } from "react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "./AppText";

const LABELS: Record<string, string> = { P: "Present", A: "Absent", L: "Late", H: "Holiday" };

export function StatusChip({
  status,
  selected,
  onPress,
  compact,
}: {
  status: string;
  selected?: boolean;
  onPress?: () => void;
  compact?: boolean;
}) {
  const { theme } = useBranding();
  const color =
    status === "P" ? theme.colors.success : status === "A" ? theme.colors.danger : status === "L" ? theme.colors.warning : theme.colors.ink;
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full px-3 py-1"
      style={{ backgroundColor: selected ? color : "#e2e8f0" }}
    >
      <AppText variant="caption" color={selected ? "white" : theme.colors.ink}>
        {compact ? status : LABELS[status] ?? status}
      </AppText>
    </Pressable>
  );
}
