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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const list = await (await api()).me.children();
      setChildren(list);
      setSelectedChild((cur) => cur ?? list[0] ?? null);
      setLoaded(true);
    })();
  }, [setSelectedChild]);

  if (!loaded) return null;
  if (children.length === 0) {
    return (
      <AppText variant="caption">No linked children — contact school office</AppText>
    );
  }

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
                void (async () => {
                  await (await api()).me.selectChild(c.studentId);
                  setSelectedChild(c);
                  setOpen(false);
                })();
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
