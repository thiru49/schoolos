import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { DeniedState, EmptyState, ErrorState, OfflineState } from "../../components/states/Feedback";

type Row = {
  id: string;
  title: string;
  body: string;
  dueDate: string;
  label: string;
  completed?: boolean;
};
type Section = { id: string; classId: string; label: string };

export function HomeworkScreen() {
  const { theme, acl, selectedChild } = useBranding();
  const router = useRouter();
  const canCreate = Boolean(acl?.permissions.includes(PERMISSIONS.HOMEWORK_CREATE));
  const canComplete = Boolean(acl?.permissions.includes(PERMISSIONS.HOMEWORK_COMPLETE));
  const isParent = Boolean(acl?.roles.includes("parent"));
  const [rows, setRows] = useState<Row[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<Row | null>(null);

  function mapError(e: unknown) {
    if (e instanceof ApiError && e.status === 403) {
      setState("denied");
      setMessage(e.message);
      return;
    }
    if (e instanceof TypeError) {
      setState("offline");
      setMessage("You appear to be offline.");
      return;
    }
    setState("error");
    setMessage(e instanceof Error ? e.message : "Failed to load homework");
  }

  const load = useCallback(async (nextSection?: Section) => {
    setState("loading");
    setMessage("");
    try {
      const client = await api();
      if (canCreate) {
        const list = await client.academics.sections();
        setSections(list);
        const first = list.find((s) => s.id === nextSection?.id) ?? list[0];
        if (!first) {
          setRows([]);
          setState("empty");
          setMessage("No classes in scope");
          return;
        }
        setSectionId(first.id);
        setClassId(first.classId);
        const hw = await client.homework.list({ sectionId: first.id });
        setRows(hw);
        setState(hw.length === 0 ? "empty" : "loaded");
        return;
      }
      if (isParent && selectedChild) {
        const hw = await client.homework.list({ studentId: selectedChild.studentId });
        setRows(hw);
        setState(hw.length === 0 ? "empty" : "loaded");
        return;
      }
      const hw = await client.homework.list();
      setRows(hw);
      setState(hw.length === 0 ? "empty" : "loaded");
    } catch (e) {
      mapError(e);
    }
  }, [canCreate, isParent, selectedChild]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!sectionId || !classId) return;
    try {
      await (await api()).homework.create({ classId, sectionId, title, body, dueDate });
      setTitle("");
      setBody("");
      await load(sections.find((s) => s.id === sectionId));
    } catch (e) {
      mapError(e);
    }
  }

  if (state === "denied") {
    return (
      <View className="flex-1 px-4 pt-16" style={{ backgroundColor: theme.colors.background }}>
        <DeniedState title="You cannot view this homework" detail={message} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background, paddingTop: 56 }}>
      <View className="px-4">
        <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
        <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 12 }}>
          Homework
        </AppText>
      </View>

      {canCreate && sections.length > 1 ? (
        <ScrollView horizontal className="mt-3" contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {sections.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => void load(s)}
              className="rounded-full px-3 py-2"
              style={{ backgroundColor: s.id === sectionId ? theme.colors.primary : "white" }}
            >
              <AppText variant="caption" color={s.id === sectionId ? "white" : theme.colors.ink}>
                {s.label}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {state === "loading" ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : null}
      {state === "offline" ? <OfflineState onRetry={() => void load()} /> : null}
      {state === "error" ? <ErrorState message={message} onRetry={() => void load()} /> : null}

      {canCreate && (state === "loaded" || state === "empty") ? (
        <View className="mt-4 px-4">
          <AppInput placeholder="Title" value={title} onChangeText={setTitle} />
          <View className="mt-2">
            <AppInput placeholder="Instructions" value={body} onChangeText={setBody} />
          </View>
          <View className="mt-2">
            <AppInput value={dueDate} onChangeText={setDueDate} />
          </View>
          <View className="mt-2">
            <AppButton label="Create homework" onPress={() => void create()} />
          </View>
        </View>
      ) : null}

      {state === "empty" ? (
        <View className="p-4">
          <EmptyState title="No homework" detail={message || "No assignments in scope."} />
        </View>
      ) : null}

      {state === "loaded" ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {rows.map((r) => (
            <Pressable key={r.id} className="mb-2 rounded-2xl bg-white p-4" onPress={() => setSelected(r)}>
              <AppText variant="label">{r.title}</AppText>
              <AppText variant="caption">
                Due {r.dueDate} · {r.label}
              </AppText>
              <AppText variant="body" style={{ marginTop: 8 }}>
                {r.body}
              </AppText>
              {canComplete ? (
                <View className="mt-3">
                  <AppButton
                    label={r.completed ? "Completed" : "Mark complete"}
                    variant={r.completed ? "secondary" : "primary"}
                    disabled={r.completed}
                    onPress={async () => {
                      await (await api()).homework.complete(r.id);
                      await load();
                    }}
                  />
                </View>
              ) : null}
              {r.completed === false && !canComplete ? (
                <AppText variant="caption" style={{ marginTop: 8 }}>
                  Not completed
                </AppText>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {selected ? (
        <View className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white p-4 shadow-lg">
          <AppText variant="title">{selected.title}</AppText>
          <AppText variant="caption">Due {selected.dueDate}</AppText>
          <AppText style={{ marginTop: 8 }}>{selected.body}</AppText>
          <View className="mt-3">
            <AppButton label="Close" variant="secondary" onPress={() => setSelected(null)} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
