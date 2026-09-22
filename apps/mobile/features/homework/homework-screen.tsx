import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Plus, BookOpen, Calendar, ChevronDown, ChevronUp, CheckCircle, Clock } from "lucide-react-native";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import {
  Screen,
  ScreenHeader,
  Card,
  Badge,
  AppButton,
  AppInput,
  ModalSheet,
  Divider,
} from "../../components/ui";
import { AppText } from "../../components/ui/AppText";
import {
  DeniedState,
  EmptyState,
  ErrorState,
  OfflineState,
} from "../../components/states/Feedback";

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

  // Homework creation modal state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));

  // Expanded card tracking (Progressive Disclosure)
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  async function handleCreateHomework() {
    if (!sectionId || !classId) return;
    if (!title.trim()) {
      setMessage("Please enter an assignment title");
      return;
    }
    setCreating(true);
    try {
      await (await api()).homework.create({
        classId,
        sectionId,
        title: title.trim(),
        body: body.trim(),
        dueDate,
      });
      setTitle("");
      setBody("");
      setCreateModalVisible(false);
      await load(sections.find((s) => s.id === sectionId));
    } catch (e) {
      mapError(e);
    } finally {
      setCreating(false);
    }
  }

  if (state === "denied") {
    return (
      <Screen scrollable={true}>
        <ScreenHeader title="Homework" showBack />
        <View className="px-6 pt-4">
          <DeniedState title="Access Restricted" detail={message || "You cannot view homework for this section."} />
        </View>
      </Screen>
    );
  }

  const currentSectionLabel = sections.find((s) => s.id === sectionId)?.label ?? "8-A";

  return (
    <Screen scrollable={false}>
      <View className="px-6 pt-4 pb-2">
        <ScreenHeader
          title="Homework"
          showBack
          subtitle={
            canCreate
              ? `Section ${currentSectionLabel} • Assignments`
              : "Assignments & Submissions"
          }
          rightElement={
            canCreate ? (
              <AppButton
                label="New"
                size="sm"
                variant="primary"
                leftIcon={<Plus size={16} color="white" />}
                onPress={() => setCreateModalVisible(true)}
              />
            ) : undefined
          }
        />

        {/* Section Selector for Teachers */}
        {canCreate && sections.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
          >
            {sections.map((s) => {
              const isSelected = s.id === sectionId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => void load(s)}
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
                    Section {s.label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {/* Loading & Feedback States */}
      {state === "loading" ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText variant="caption" style={{ marginTop: 12, color: "#64748B" }}>
            Loading assignments…
          </AppText>
        </View>
      ) : null}

      {state === "offline" ? <OfflineState onRetry={() => void load()} /> : null}
      {state === "error" ? <ErrorState message={message} onRetry={() => void load()} /> : null}
      {state === "empty" ? (
        <View className="p-6 items-center">
          <EmptyState
            title="No Homework Due"
            detail={
              canCreate
                ? `No homework assignments created for Section ${currentSectionLabel}.`
                : "All assignments are currently complete."
            }
          />
          {canCreate ? (
            <View className="mt-4 w-full">
              <AppButton
                label="Create First Homework"
                variant="primary"
                onPress={() => setCreateModalVisible(true)}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Homework Cards List (Progressive Disclosure) */}
      {state === "loaded" ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}>
          <View className="gap-y-3">
            {rows.map((r) => {
              const isExpanded = expandedId === r.id;
              return (
                <Card key={r.id} variant="default">
                  <Pressable
                    onPress={() => setExpandedId(isExpanded ? null : r.id)}
                    className="active:opacity-80"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Badge label={r.label || "Curriculum"} variant="primary" />
                      <View className="flex-row items-center gap-x-1.5">
                        <Clock size={14} color="#64748B" />
                        <AppText variant="caption" style={{ color: "#64748B", fontWeight: "600" }}>
                          Due {r.dueDate}
                        </AppText>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 pr-2">
                        <AppText variant="title" style={{ fontSize: 16, fontWeight: "700" }}>
                          {r.title}
                        </AppText>
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={20} color="#94A3B8" />
                      ) : (
                        <ChevronDown size={20} color="#94A3B8" />
                      )}
                    </View>

                    {/* Expandable Detail Section */}
                    {isExpanded ? (
                      <View className="mt-3 pt-3 border-t border-slate-100">
                        <AppText variant="caption" style={{ color: "#64748B", fontWeight: "600", marginBottom: 4 }}>
                          Instructions:
                        </AppText>
                        <AppText variant="body" style={{ color: "#334155", lineHeight: 20 }}>
                          {r.body || "No additional instructions provided."}
                        </AppText>

                        {canComplete ? (
                          <View className="mt-4">
                            <AppButton
                              label={r.completed ? "Completed" : "Mark as Complete"}
                              variant={r.completed ? "secondary" : "primary"}
                              disabled={r.completed}
                              leftIcon={r.completed ? <CheckCircle size={16} color="#059669" /> : undefined}
                              onPress={async () => {
                                await (await api()).homework.complete(r.id);
                                await load();
                              }}
                            />
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </Pressable>
                </Card>
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      {/* Homework Creation Modal Sheet (Recurrly Pattern 6) */}
      <ModalSheet
        visible={createModalVisible}
        title={`Assign Homework • ${currentSectionLabel}`}
        onClose={() => setCreateModalVisible(false)}
      >
        <View className="p-4 gap-y-3.5">
          <AppInput
            label="Assignment Title"
            placeholder="e.g. Chapter 4 Fractions Exercises"
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
          />

          <AppInput
            label="Instructions / Details"
            placeholder="Explain exercises, textbook pages, or guidelines…"
            value={body}
            onChangeText={setBody}
            multiline={true}
            style={{ height: 90 }}
          />

          <AppInput
            label="Due Date (YYYY-MM-DD)"
            placeholder="YYYY-MM-DD"
            value={dueDate}
            onChangeText={setDueDate}
            leftIcon={<Calendar size={18} color="#94A3B8" />}
          />

          <View className="mt-3 gap-y-2">
            <AppButton
              label={creating ? "Publishing…" : "Publish Homework"}
              loading={creating}
              variant="primary"
              onPress={() => void handleCreateHomework()}
            />
            <AppButton
              label="Cancel"
              variant="outline"
              onPress={() => setCreateModalVisible(false)}
            />
          </View>
        </View>
      </ModalSheet>
    </Screen>
  );
}
