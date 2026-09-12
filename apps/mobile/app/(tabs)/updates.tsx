import { Text, View } from "react-native";
import { useBranding } from "../../features/branding/branding-provider";

export default function Updates() {
  const { theme } = useBranding();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 24, paddingTop: 64 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.colors.primary }}>Updates</Text>
      <Text style={{ marginTop: 8 }}>No updates yet.</Text>
    </View>
  );
}
