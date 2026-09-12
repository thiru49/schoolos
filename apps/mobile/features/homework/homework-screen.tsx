import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { PERMISSIONS } from "@schoolos/permissions";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { EmptyState, ErrorState } from "../../components/states/Feedback";

type Row = {
  id: string;
  title: string;
  body: string;
  dueDate: string;
  label: string;
  completed?: boolean;
};

export function HomeworkScreen() {
  const { theme, acl, selectedChild } = useBranding();
  const router = useRouter();
  const canCreate = acl?.permissions.includes(PERMISSIONS.HOMEWORK_CREATE);
  const canComplete = acl?.permissions.includes(PERMISSIONS.HOMEWORK_COMPLETE);
  const isParent = acl?.roles.includes("parent");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const client = await api();
      if (canCreate) {
        const sections = await client.academics.sections();
        const first = sections[0];
        if (first) {
          setSectionId(first.id);
          setClassId(first.classId);
          setRows(await client.homework.list({ sectionId: first.id }));
        } else setRows([]);
      } else if (isParent && selectedChild) {
        setRows(await client.homework.list({ studentId: selectedChild.studentId }));
      } else {
        setRows(await client.homework.list());
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load homework");
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
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background, paddingTop: 56 }}>
      <View className="px-4">
        <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
        <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 12 }}>
          Homework
        </AppText>
      </View>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {canCreate ? (
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
      {rows.length === 0 && !error ? (
        <View className="p-4">
          <EmptyState title="No homework" detail="No assignments in scope." />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {rows.map((r) => (
            <View key={r.id} className="mb-2 rounded-2xl bg-white p-4">
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
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
