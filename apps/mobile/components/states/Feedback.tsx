import { View } from "react-native";
import { AppText } from "../ui/AppText";
import { AppButton } from "../ui/AppButton";
import { useBranding } from "../../features/branding/branding-provider";

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <View className="items-center rounded-2xl bg-white px-4 py-12">
      <AppText variant="title">{title}</AppText>
      <AppText variant="caption" style={{ marginTop: 8, textAlign: "center" }}>
        {detail}
      </AppText>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { theme } = useBranding();
  return (
    <View className="items-center px-4 py-12">
      <AppText variant="title" color={theme.colors.danger}>
        Something went wrong
      </AppText>
      <AppText variant="caption" style={{ marginTop: 8, textAlign: "center" }}>
        {message}
      </AppText>
      {onRetry ? <View className="mt-4 w-full"><AppButton label="Retry" onPress={onRetry} /></View> : null}
    </View>
  );
}

export function DeniedState({ detail, title }: { detail: string; title?: string }) {
  const { theme } = useBranding();
  return (
    <View className="items-center rounded-2xl bg-white px-4 py-16">
      <AppText variant="title" color={theme.colors.primary}>
        {title ?? "You cannot mark this class"}
      </AppText>
      <AppText variant="caption" style={{ marginTop: 8, textAlign: "center" }}>
        {detail}
      </AppText>
    </View>
  );
}

export function OfflineState({ onRetry }: { onRetry: () => void }) {
  return <ErrorState message="You appear to be offline." onRetry={onRetry} />;
}
