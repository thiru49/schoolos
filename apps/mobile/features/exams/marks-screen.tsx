import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { DeniedState, EmptyState, ErrorState, OfflineState } from "../../components/states/Feedback";
import { ChildSwitcher } from "../parent/child-switcher";
import { TeacherMarksEntry } from "./teacher-marks-entry";

type Exam = { id: string; name: string; examDate: string; subjectName: string; maxScore: number };
type Row = { fullName: string; score: number | null; status: string | null };

export function MarksScreen() {
  const { theme, acl, selectedChild } = useBranding();
  const router = useRouter();
  const canDraft = Boolean(acl?.permissions.includes(PERMISSIONS.MARKS_DRAFT));
  const isParent = Boolean(acl?.roles.includes("parent"));
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [examName, setExamName] = useState("");
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async (nextExamId?: string) => {
    setState("loading");
    setMessage("");
    try {
      const client = await api();
      const list = await client.exams.list(
        isParent && selectedChild ? { studentId: selectedChild.studentId } : undefined,
      );
      setExams(list);
      const first = list.find((e) => e.id === nextExamId) ?? list[0];
      if (first) {
        setExamId(first.id);
        const data = await client.exams.marks(
          first.id,
          isParent && selectedChild ? selectedChild.studentId : undefined,
        );
        setExamName(`${data.exam.name} · ${data.exam.subjectName}`);
        setRows(data.rows);
        setState(data.rows.length === 0 ? "empty" : "loaded");
      } else {
        setRows([]);
        setState("empty");
      }
    } catch (e) {
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
      setMessage(e instanceof Error ? e.message : "Failed to load marks");
    }
  }, [isParent, selectedChild]);

  useEffect(() => {
    void load();
  }, [load]);

  if (canDraft) return <TeacherMarksEntry />;

  if (state === "denied") {
    return (
      <View className="flex-1 px-4 pt-16" style={{ backgroundColor: theme.colors.background }}>
        <DeniedState title="You cannot view these marks" detail={message} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background, paddingTop: 56 }}>
      <View className="px-4">
        <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
        <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 12 }}>
          Marks
        </AppText>
        <AppText variant="caption">{examName}</AppText>
        <View className="mt-3">
          <AppButton label="Report card" variant="secondary" onPress={() => router.push("/report-card")} />
        </View>
      </View>
      {isParent ? (
        <View className="mt-3 px-4">
          <ChildSwitcher />
        </View>
      ) : null}
      {exams.length > 1 ? (
        <ScrollView horizontal className="mt-3" contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {exams.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => void load(e.id)}
              className="rounded-full px-3 py-2"
              style={{ backgroundColor: e.id === examId ? theme.colors.primary : "white" }}
            >
              <AppText variant="caption" color={e.id === examId ? "white" : theme.colors.ink}>
                {e.name}
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
      {state === "empty" ? (
        <View className="p-4">
          <EmptyState title="No published marks" detail="Scores appear after academic publish." />
        </View>
      ) : null}
      {state === "loaded" ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {rows.map((r, i) => (
            <View key={`${r.fullName}-${i}`} className="mb-2 rounded-2xl bg-white p-4">
              <AppText variant="label">{r.fullName}</AppText>
              <AppText variant="caption">
                {r.score == null ? "Not published" : `${r.score}`} · {r.status ?? ""}
              </AppText>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
