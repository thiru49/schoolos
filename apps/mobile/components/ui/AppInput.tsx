import { TextInput, type TextInputProps } from "react-native";

export function AppInput(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      className="rounded-xl bg-white px-3 py-3"
      style={[{ fontSize: 16 }, props.style]}
      placeholderTextColor="#94a3b8"
    />
  );
}
