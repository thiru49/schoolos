import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { api } from "./api";

export async function registerPushToken(): Promise<void> {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
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
