import React, { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "./AppText";

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxHeightRatio?: number;
}

export function ModalSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxHeightRatio = 0.85,
}: ModalSheetProps) {
  const { theme } = useBranding();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end"
      >
        {/* Backdrop */}
        <Pressable
          className="flex-1"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.45)" }}
          onPress={onClose}
        />

        {/* Sheet Content */}
        <SafeAreaView
          edges={["bottom"]}
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: `${Math.round(maxHeightRatio * 100)}%`,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          {/* Drag Handle */}
          <View className="items-center pt-3 pb-1">
            <View
              className="w-12 h-1.5 rounded-full"
              style={{ backgroundColor: "#CBD5E1" }}
            />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-2 pb-3 border-b border-slate-100">
            <View className="flex-1 pr-2">
              <AppText
                variant="title"
                color={theme.colors.primary}
                style={{ fontSize: 18, fontWeight: "700" }}
              >
                {title}
              </AppText>
              {subtitle ? (
                <AppText variant="caption" color="#64748B" style={{ marginTop: 2 }}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Close sheet"
            >
              <X size={18} color="#475569" />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
