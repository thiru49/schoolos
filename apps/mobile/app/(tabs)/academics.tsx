import { Text, View } from "react-native";
import { useBranding } from "../../features/branding/branding-provider";

export default function Academics() {
  const { theme } = useBranding();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 24, paddingTop: 64 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.colors.primary }}>Academics</Text>
      <Text style={{ marginTop: 8 }}>Attendance is the first vertical slice. Other modules are not in this build.</Text>
    </View>
  );
}
