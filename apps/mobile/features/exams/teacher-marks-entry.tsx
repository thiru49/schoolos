import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@schoolos/api-client";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { DeniedState, EmptyState, ErrorState, OfflineState } from "../../components/states/Feedback";

type Exam = { id: string; name: string; examDate: string; subjectName: string; maxScore: number; label: string };
type Row = { studentId: string; fullName: string; admissionNumber: string; score: number | null; status: string | null };

export function TeacherMarksEntry() {
  const { theme } = useBranding();
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState<string | null>(null);
  const [maxScore, setMaxScore] = useState(0);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");

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
    setMessage(e instanceof Error ? e.message : "Failed to load marks");
  }

  const loadExams = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const list = await (await api()).exams.list();
      setExams(list);
      if (list.length === 0) {
        setState("empty");
        return;
      }
      const first = list.find((e) => e.id === examId) ?? list[0];
      setExamId(first.id);
      const data = await (await api()).exams.marks(first.id);
      setTitle(`${data.exam.name} · ${data.exam.subjectName}`);
      setMaxScore(data.exam.maxScore);
      setRows(data.rows);
      setState(data.rows.length === 0 ? "empty" : "loaded");
    } catch (e) {
      mapError(e);
    }
  }, [examId]);

  useEffect(() => {
    void loadExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openExam(id: string) {
    setExamId(id);
    setState("loading");
    try {
      const data = await (await api()).exams.marks(id);
      setTitle(`${data.exam.name} · ${data.exam.subjectName}`);
      setMaxScore(data.exam.maxScore);
      setRows(data.rows);
      setState(data.rows.length === 0 ? "empty" : "loaded");
    } catch (e) {
      mapError(e);
    }
  }

  async function saveDraft() {
    if (!examId) return;
    try {
      const marks = rows
        .filter((r) => r.score != null && r.status !== "submitted" && r.status !== "published")
        .map((r) => ({ studentId: r.studentId, score: r.score as number }));
      if (marks.length === 0) {
        setMessage("Enter at least one draft score");
        return;
      }
      await (await api()).exams.draft(examId, marks);
      await openExam(examId);
    } catch (e) {
      mapError(e);
    }
  }

  if (state === "denied") {
    return (
      <View className="flex-1 px-4 pt-16" style={{ backgroundColor: theme.colors.background }}>
        <DeniedState title="You cannot enter marks for this exam" detail={message} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background, paddingTop: 56 }}>
      <View className="px-4">
        <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
        <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 12 }}>
          Marks entry
        </AppText>
        <AppText variant="caption">{title} {maxScore ? `(max ${maxScore})` : ""}</AppText>
      </View>

      {exams.length > 1 ? (
        <ScrollView horizontal className="mt-3" contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {exams.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => void openExam(e.id)}
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
      {state === "offline" ? <OfflineState onRetry={() => void loadExams()} /> : null}
      {state === "error" ? <ErrorState message={message} onRetry={() => void loadExams()} /> : null}
      {state === "empty" ? (
        <View className="p-4">
          <EmptyState title="No exam" detail={message || "No exam in your assigned section."} />
        </View>
      ) : null}

      {state === "loaded" ? (
        <>
          {message ? (
            <AppText variant="caption" color={theme.colors.danger} style={{ paddingHorizontal: 16, marginTop: 8 }}>
              {message}
            </AppText>
          ) : null}
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
            {rows.map((r) => (
              <View key={r.studentId} className="mb-2 rounded-2xl bg-white p-3">
                <AppText variant="label">{r.fullName}</AppText>
                <AppText variant="caption">{r.admissionNumber} · {r.status ?? "—"}</AppText>
                {r.status === "submitted" || r.status === "published" ? (
                  <AppText style={{ marginTop: 8 }}>{r.score ?? "—"}</AppText>
                ) : (
                  <View className="mt-2">
                    <AppInput
                      keyboardType="numeric"
                      value={r.score == null ? "" : String(r.score)}
                      onChangeText={(v) =>
                        setRows((prev) =>
                          prev.map((row) =>
                            row.studentId === r.studentId
                              ? { ...row, score: v === "" ? null : Number(v) }
                              : row,
                          ),
                        )
                      }
                    />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          <View className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3" style={{ backgroundColor: theme.colors.background }}>
            <AppButton label="Save draft" onPress={() => void saveDraft()} />
          </View>
        </>
      ) : null}
    </View>
  );
}
