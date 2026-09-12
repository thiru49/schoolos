import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import type { LinkedChild } from "@schoolos/types";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";

export function ChildSwitcher() {
  const { selectedChild, setSelectedChild, theme } = useBranding();
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const list = await (await api()).me.children();
      setChildren(list);
      setSelectedChild((cur) => cur ?? list[0] ?? null);
    })();
  }, [setSelectedChild]);

  if (children.length === 0) return null;

  return (
    <View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="rounded-full bg-white px-4 py-2"
        style={{ alignSelf: "flex-start" }}
      >
        <AppText variant="label">
          {selectedChild ? `${selectedChild.fullName} · ${selectedChild.className}-${selectedChild.sectionName}` : "Select child"}
        </AppText>
      </Pressable>
      {open
        ? children.map((c) => (
            <Pressable
              key={c.studentId}
              onPress={() => {
                setSelectedChild(c);
                setOpen(false);
              }}
              className="mt-2 rounded-xl bg-white px-4 py-3"
            >
              <AppText color={c.studentId === selectedChild?.studentId ? theme.colors.primary : theme.colors.ink}>
                {c.fullName} · {c.className}-{c.sectionName}
              </AppText>
            </Pressable>
          ))
        : null}
    </View>
  );
}
