import "../global.css";
import { Stack } from "expo-router";
import { BrandingProvider } from "../features/branding/branding-provider";

export default function RootLayout() {
  return (
    <BrandingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </BrandingProvider>
  );
}
