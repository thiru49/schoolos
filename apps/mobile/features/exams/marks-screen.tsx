import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { EmptyState, ErrorState } from "../../components/states/Feedback";

type Exam = { id: string; name: string; examDate: string; subjectName: string; maxScore: number };
type Row = { fullName: string; score: number | null; status: string | null };

export function MarksScreen() {
  const { theme, acl, selectedChild } = useBranding();
  const router = useRouter();
  const isParent = acl?.roles.includes("parent");
  const [exams, setExams] = useState<Exam[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [examName, setExamName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const client = await api();
      const list = await client.exams.list(
        isParent && selectedChild ? { studentId: selectedChild.studentId } : undefined,
      );
      setExams(list);
      const first = list[0];
      if (first) {
        const data = await client.exams.marks(
          first.id,
          isParent && selectedChild ? selectedChild.studentId : undefined,
        );
        setExamName(`${data.exam.name} · ${data.exam.subjectName}`);
        setRows(data.rows);
      } else {
        setRows([]);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load marks");
    }
  }, [isParent, selectedChild]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background, paddingTop: 56 }}>
      <View className="px-4">
        <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
        <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 12 }}>
          Marks
        </AppText>
        <AppText variant="caption">{examName}</AppText>
      </View>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {exams.length === 0 && !error ? (
        <View className="p-4">
          <EmptyState title="No published marks" detail="Scores appear after academic publish." />
        </View>
      ) : (
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
      )}
    </View>
  );
}
