import { Tabs } from "expo-router";
import { Home, BookOpen, Bell, User } from "lucide-react-native";
import { useBranding } from "../../features/branding/branding-provider";

export default function TabsLayout() {
  const { theme } = useBranding();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarStyle: { backgroundColor: "white" },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ color }) => <Home size={20} color={color} /> }} />
      <Tabs.Screen
        name="academics"
        options={{ title: "Academics", tabBarIcon: ({ color }) => <BookOpen size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="updates"
        options={{ title: "Updates", tabBarIcon: ({ color }) => <Bell size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color }) => <User size={20} color={color} /> }}
      />
    </Tabs>
  );
}
