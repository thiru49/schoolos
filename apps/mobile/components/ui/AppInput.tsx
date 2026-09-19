import React, { useState, type ReactNode } from "react";
import {
  Pressable,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { AppText } from "./AppText";

export interface AppInputProps extends TextInputProps {
  label?: string;
  required?: boolean;
  helperText?: string;
  errorText?: string | null;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerStyle?: ViewStyle;
}

export function AppInput({
  label,
  required = false,
  helperText,
  errorText,
  leftIcon,
  rightIcon,
  secureTextEntry,
  containerStyle,
  ...props
}: AppInputProps) {
  const { theme } = useBranding();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const showPasswordToggle = secureTextEntry;
  const actualSecure = secureTextEntry && !isPasswordVisible;

  const borderColor = errorText
    ? theme.colors.danger
    : isFocused
    ? theme.colors.primary
    : "#CBD5E1";

  return (
    <View style={[{ width: "100%" }, containerStyle]}>
      {label ? (
        <View className="flex-row items-center mb-1.5 px-0.5">
          <AppText
            variant="label"
            style={{ fontSize: 14, fontWeight: "600", color: "#334155" }}
          >
            {label}
          </AppText>
          {required ? (
            <AppText
              variant="caption"
              color={theme.colors.danger}
              style={{ marginLeft: 4, fontWeight: "700" }}
            >
              *
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          borderRadius: 14,
          borderWidth: isFocused || errorText ? 1.5 : 1,
          borderColor,
          paddingHorizontal: 14,
          minHeight: 50,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 3,
          elevation: 1,
        }}
      >
        {leftIcon ? <View className="mr-2.5">{leftIcon}</View> : null}

        <TextInput
          placeholderTextColor="#94A3B8"
          secureTextEntry={actualSecure}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
          style={[
            {
              flex: 1,
              fontSize: 16,
              color: "#0F172A",
              paddingVertical: 12,
            },
            props.style,
          ]}
        />

        {showPasswordToggle ? (
          <Pressable
            onPress={() => setIsPasswordVisible((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="p-1.5 ml-1"
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
          >
            {isPasswordVisible ? (
              <EyeOff size={20} color="#64748B" />
            ) : (
              <Eye size={20} color="#64748B" />
            )}
          </Pressable>
        ) : rightIcon ? (
          <View className="ml-2">{rightIcon}</View>
        ) : null}
      </View>

      {errorText ? (
        <AppText
          variant="caption"
          color={theme.colors.danger}
          style={{ marginTop: 4, paddingHorizontal: 2, fontWeight: "600" }}
        >
          {errorText}
        </AppText>
      ) : helperText ? (
        <AppText
          variant="caption"
          color="#64748B"
          style={{ marginTop: 4, paddingHorizontal: 2 }}
        >
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}
