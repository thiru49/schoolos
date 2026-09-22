import React from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { WifiOff, RefreshCw } from "lucide-react-native";
import { AppText } from "../ui/AppText";

export interface OfflineBannerProps {
  cachedTime?: string | null;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function OfflineBanner({
  cachedTime,
  onRetry,
  style,
}: OfflineBannerProps) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#FEF3C7",
          borderColor: "#FCD34D",
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 10,
          marginBottom: 12,
        },
        style,
      ]}
    >
      <View className="flex-row items-center gap-2 flex-1 pr-2">
        <WifiOff size={18} color="#B45309" />
        <View className="flex-1">
          <AppText
            variant="caption"
            style={{ fontWeight: "700", color: "#92400E" }}
          >
            Offline Mode
          </AppText>
          <AppText
            variant="caption"
            style={{ fontSize: 11, color: "#B45309", marginTop: 1 }}
          >
            {cachedTime ? `Showing data cached at ${cachedTime}` : "Viewing cached content"}
          </AppText>
        </View>
      </View>

      {onRetry ? (
        <Pressable
          onPress={onRetry}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="flex-row items-center gap-1 bg-amber-200/80 px-2.5 py-1.5 rounded-lg"
        >
          <RefreshCw size={13} color="#92400E" />
          <AppText
            variant="caption"
            style={{ fontWeight: "700", color: "#92400E", fontSize: 11 }}
          >
            Retry
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
