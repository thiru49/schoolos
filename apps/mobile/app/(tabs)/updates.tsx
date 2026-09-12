import { View } from "react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { EmptyState } from "../../components/states/Feedback";

export default function Updates() {
  const { theme } = useBranding();
  return (
    <View className="flex-1 px-6 pt-16" style={{ backgroundColor: theme.colors.background }}>
      <AppText variant="title" color={theme.colors.primary}>
        Updates
      </AppText>
      <View className="mt-6">
        <EmptyState title="No updates yet" detail="Notices are not part of this slice." />
      </View>
    </View>
  );
}
