import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import type { LinkedChild } from "@schoolos/types";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { Card, Badge } from "../../components/ui";

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
      <AppText variant="caption" color={theme.colors.inkMuted}>
        No linked children — contact school office
      </AppText>
    );
  }

  return (
    <View>
      <Pressable onPress={() => setOpen((v) => !v)}>
        <Card variant="outlined">
          <View className="flex-row items-center justify-between">
            <View>
              <AppText variant="caption" color={theme.colors.inkMuted}>
                Viewing child
              </AppText>
              <AppText variant="label" style={{ marginTop: 2 }}>
                {selectedChild
                  ? `${selectedChild.fullName} · ${selectedChild.className}-${selectedChild.sectionName}`
                  : "Select child"}
              </AppText>
            </View>
            <Badge label={open ? "Close" : children.length > 1 ? "Switch" : "Linked"} variant="info" />
          </View>
        </Card>
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
            >
              <Card variant={c.studentId === selectedChild?.studentId ? "elevated" : "default"} style={{ marginTop: 8 }}>
                <AppText color={c.studentId === selectedChild?.studentId ? theme.colors.primary : theme.colors.ink}>
                  {c.fullName} · {c.className}-{c.sectionName}
                </AppText>
              </Card>
            </Pressable>
          ))
        : null}
    </View>
  );
}
