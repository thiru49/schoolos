import { View } from "react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { EmptyState } from "../../components/states/Feedback";

export default function Academics() {
  const { theme } = useBranding();
  return (
    <View className="flex-1 px-6 pt-16" style={{ backgroundColor: theme.colors.background }}>
      <AppText variant="title" color={theme.colors.primary}>
        Academics
      </AppText>
      <View className="mt-6">
        <EmptyState title="Homework and marks" detail="These modules are not in the attendance vertical slice." />
      </View>
    </View>
  );
}
