import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Award, Lock, CheckCircle2, AlertCircle, Send } from "lucide-react-native";
import { ApiError } from "@schoolos/api-client";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import {
  Screen,
  ScreenHeader,
  Card,
  Avatar,
  Badge,
  AppButton,
  AppInput,
  StickyActionBar,
  ModalSheet,
} from "../../components/ui";
import { AppText } from "../../components/ui/AppText";
import {
  DeniedState,
  EmptyState,
  ErrorState,
  OfflineState,
} from "../../components/states/Feedback";

type Exam = {
  id: string;
  name: string;
  examDate: string;
  subjectName: string;
  maxScore: number;
  label: string;
};
type Row = {
  studentId: string;
  fullName: string;
  admissionNumber: string;
  score: number | null;
  status: string | null;
};

export function TeacherMarksEntry() {
  const { theme } = useBranding();
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState<string | null>(null);
  const [maxScore, setMaxScore] = useState(100);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<
    "loading" | "loaded" | "saving" | "submitting" | "empty" | "error" | "denied" | "offline"
  >("loading");
  const [message, setMessage] = useState("");
  const [confirmSubmitModal, setConfirmSubmitModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setTitle(`${data.exam.name} • ${data.exam.subjectName}`);
      setMaxScore(data.exam.maxScore ?? 100);
      setRows(data.rows);
      setState(data.rows.length === 0 ? "empty" : "loaded");
    } catch (e) {
      mapError(e);
    }
  }, [examId]);

  useEffect(() => {
    void loadExams();
  }, []);

  async function openExam(id: string) {
    setExamId(id);
    setState("loading");
    try {
      const data = await (await api()).exams.marks(id);
      setTitle(`${data.exam.name} • ${data.exam.subjectName}`);
      setMaxScore(data.exam.maxScore ?? 100);
      setRows(data.rows);
      setState(data.rows.length === 0 ? "empty" : "loaded");
    } catch (e) {
      mapError(e);
    }
  }

  const isSubmittedOrPublished = rows.some(
    (r) => r.status === "submitted" || r.status === "published",
  );
  const allDrafted =
    rows.length > 0 && rows.every((r) => r.score != null && r.score >= 0);

  // Validation: Check if any score exceeds maxScore
  const hasInvalidScore = rows.some((r) => r.score != null && r.score > maxScore);

  async function saveDraft() {
    if (!examId) return;
    if (hasInvalidScore) {
      setMessage(`Scores cannot exceed max score of ${maxScore}`);
      return;
    }
    setIsSaving(true);
    try {
      const marks = rows
        .filter((r) => r.score != null && r.status !== "submitted" && r.status !== "published")
        .map((r) => ({ studentId: r.studentId, score: r.score as number }));
      if (marks.length === 0) {
        setMessage("Please enter at least one score before saving");
        return;
      }
      await (await api()).exams.draft(examId, marks);
      await openExam(examId);
    } catch (e) {
      mapError(e);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitMarks() {
    if (!examId) return;
    if (hasInvalidScore) {
      setMessage(`Cannot submit: some scores exceed max score of ${maxScore}`);
      return;
    }
    setIsSubmitting(true);
    setConfirmSubmitModal(false);
    try {
      await (await api()).exams.submit(examId);
      await openExam(examId);
    } catch (e) {
      mapError(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (state === "denied") {
    return (
      <Screen scrollable={true}>
        <ScreenHeader title="Marks Entry" showBack />
        <View className="px-6 pt-4">
          <DeniedState title="Access Restricted" detail={message || "You cannot enter marks for this exam."} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <View className="px-6 pt-4 pb-2">
        <ScreenHeader
          title="Marks Entry"
          subtitle={title || "Exam Grading Roster"}
          showBack
        />

        {/* Exam Selection Pills */}
        {exams.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
          >
            {exams.map((e) => {
              const isSelected = e.id === examId;
              return (
                <Pressable
                  key={e.id}
                  onPress={() => void openExam(e.id)}
                  className="px-4 py-2 rounded-xl border active:opacity-80"
                  style={{
                    backgroundColor: isSelected ? theme.colors.primary : "#FFFFFF",
                    borderColor: isSelected ? theme.colors.primary : "#CBD5E1",
                  }}
                >
                  <AppText
                    variant="caption"
                    style={{
                      fontWeight: "700",
                      color: isSelected ? "#FFFFFF" : "#334155",
                    }}
                  >
                    {e.name}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Exam Status & Max Score Summary Card */}
        <Card variant="default" style={{ marginBottom: 12, padding: 12 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-x-2">
              {isSubmittedOrPublished ? (
                <Badge label="Submitted / Locked" variant="info" />
              ) : (
                <Badge label="Draft Mode" variant="warning" />
              )}
              <Badge label={`Max Score: ${maxScore}`} variant="neutral" />
            </View>

            {isSubmittedOrPublished ? (
              <View className="flex-row items-center gap-x-1">
                <Lock size={14} color="#64748B" />
                <AppText variant="caption" style={{ color: "#64748B" }}>Locked</AppText>
              </View>
            ) : null}
          </View>
        </Card>

        {message && (state === "loaded" || state === "error") ? (
          <View className="p-2 mb-2 bg-red-50 border border-red-200 rounded-xl">
            <AppText variant="caption" color={theme.colors.danger} style={{ fontWeight: "600" }}>
              {message}
            </AppText>
          </View>
        ) : null}
      </View>

      {/* States */}
      {state === "loading" ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText variant="caption" style={{ marginTop: 12, color: "#64748B" }}>
            Loading marks roster…
          </AppText>
        </View>
      ) : null}

      {state === "offline" ? <OfflineState onRetry={() => void loadExams()} /> : null}
      {state === "error" ? <ErrorState message={message} onRetry={() => void loadExams()} /> : null}
      {state === "empty" ? (
        <View className="p-6">
          <EmptyState title="No Exams Found" detail={message || "No exams currently scheduled in your scope."} />
        </View>
      ) : null}

      {/* Student Marks List */}
      {(state === "loaded" || state === "saving" || state === "submitting") && rows.length > 0 ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}>
          <View className="gap-y-2.5">
            {rows.map((r, idx) => {
              const isInvalid = r.score != null && r.score > maxScore;
              return (
                <Card key={r.studentId} variant="default" style={{ padding: 12 }}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-x-3 flex-1 pr-3">
                      <Avatar name={r.fullName} size="sm" />
                      <View className="flex-1">
                        <AppText variant="title" style={{ fontSize: 15, fontWeight: "700" }}>
                          {r.fullName}
                        </AppText>
                        <AppText variant="caption" style={{ color: "#64748B", fontSize: 12 }}>
                          {r.admissionNumber ? `ID: ${r.admissionNumber}` : `Roll #${idx + 1}`}
                        </AppText>
                      </View>
                    </View>

                    {isSubmittedOrPublished ? (
                      <View className="px-4 py-2 bg-slate-100 rounded-xl items-center">
                        <AppText variant="title" style={{ fontSize: 16, fontWeight: "800", color: "#1E293B" }}>
                          {r.score != null ? `${r.score} / ${maxScore}` : "—"}
                        </AppText>
                      </View>
                    ) : (
                      <View className="w-24">
                        <AppInput
                          keyboardType="numeric"
                          placeholder={`0-${maxScore}`}
                          value={r.score == null ? "" : String(r.score)}
                          onChangeText={(v) => {
                            if (message) setMessage("");
                            setRows((prev) =>
                              prev.map((row) =>
                                row.studentId === r.studentId
                                  ? { ...row, score: v === "" ? null : Number(v) }
                                  : row,
                              ),
                            );
                          }}
                          style={{
                            textAlign: "center",
                            fontWeight: "700",
                            borderColor: isInvalid ? "#DC2626" : "#E2E8F0",
                          }}
                        />
                        {isInvalid ? (
                          <AppText variant="caption" color="#DC2626" style={{ fontSize: 10, marginTop: 2, textAlign: "center" }}>
                            Exceeds {maxScore}
                          </AppText>
                        ) : null}
                      </View>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      {/* Sticky Bottom Actions */}
      {!isSubmittedOrPublished && rows.length > 0 && state === "loaded" ? (
        <StickyActionBar>
          <View className="flex-row gap-x-3 w-full">
            <View className="flex-1">
              <AppButton
                label={rows.some((r) => r.score != null) ? "Update Draft" : "Save Draft"}
                variant="outline"
                loading={isSaving}
                onPress={() => void saveDraft()}
              />
            </View>

            {allDrafted ? (
              <View className="flex-1">
                <AppButton
                  label="Submit Marks"
                  variant="primary"
                  rightIcon={<Send size={16} color="white" />}
                  onPress={() => setConfirmSubmitModal(true)}
                />
              </View>
            ) : null}
          </View>
        </StickyActionBar>
      ) : null}

      {/* Submission Confirmation Sheet */}
      <ModalSheet
        visible={confirmSubmitModal}
        title="Confirm Marks Submission"
        onClose={() => setConfirmSubmitModal(false)}
      >
        <View className="p-4 gap-y-3">
          <AppText variant="body" style={{ color: "#475569" }}>
            Are you sure you want to submit marks for <AppText style={{ fontWeight: "700" }}>{title}</AppText>?
          </AppText>
          <AppText variant="caption" style={{ color: "#64748B" }}>
            Once submitted, marks will be locked for official review and cannot be edited by the class teacher without administrative override.
          </AppText>

          <View className="mt-4 gap-y-2">
            <AppButton
              label="Confirm & Submit"
              variant="primary"
              loading={isSubmitting}
              onPress={() => void handleSubmitMarks()}
            />
            <AppButton
              label="Keep Editing"
              variant="outline"
              onPress={() => setConfirmSubmitModal(false)}
            />
          </View>
        </View>
      </ModalSheet>
    </Screen>
  );
}
