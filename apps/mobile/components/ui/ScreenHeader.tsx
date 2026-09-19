import React, { type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "./AppText";

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  taSubtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  taSubtitle,
  showBack = false,
  onBack,
  rightElement,
}: ScreenHeaderProps) {
  const router = useRouter();
  const { theme } = useBranding();

  const handleBack = onBack ?? (() => router.back());
  // Show chevron when explicitly requested, or when a custom onBack handler is provided.
  const displayBack = showBack || onBack != null;

  return (
    <View className="flex-row items-center justify-between px-5 pt-3 pb-3">
      <View className="flex-row items-center flex-1 pr-2">
        {displayBack ? (
          <Pressable
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="mr-3 w-10 h-10 rounded-full bg-white items-center justify-center border border-slate-200 shadow-sm"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} color={theme.colors.ink} />
          </Pressable>
        ) : null}
        <View className="flex-1">
          <AppText
            variant="title"
            color={theme.colors.primary}
            style={{ fontWeight: "700", letterSpacing: -0.3 }}
            numberOfLines={1}
          >
            {title}
          </AppText>
          {subtitle || taSubtitle ? (
            <View className="flex-row items-center gap-1.5 mt-0.5">
              {subtitle ? (
                <AppText
                  variant="caption"
                  color="#64748B"
                  numberOfLines={1}
                >
                  {subtitle}
                </AppText>
              ) : null}
              {subtitle && taSubtitle ? (
                <AppText variant="caption" color="#94A3B8">
                  •
                </AppText>
              ) : null}
              {taSubtitle ? (
                <AppText
                  variant="caption"
                  color={theme.colors.accent}
                  numberOfLines={1}
                >
                  {taSubtitle}
                </AppText>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
      {rightElement ? <View className="items-end">{rightElement}</View> : null}
    </View>
  );
}
