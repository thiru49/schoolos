import Constants from "expo-constants";
import { api } from "./api";

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

export async function registerPushToken(): Promise<void> {
  // Android remote push was removed from Expo Go in SDK 53+.
  // Skip in Expo Go; use a development build for real push tokens.
  if (isExpoGo()) return;

  try {
    const Notifications = await import("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    const permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== "granted") return;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (!token.data) return;
    await (await api()).notifications.savePushToken(token.data);
  } catch {
    // In-app inbox still delivers. Expo push is optional when the runtime cannot issue a token.
  }
}
