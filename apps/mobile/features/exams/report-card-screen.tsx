import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@schoolos/api-client";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { Screen, ScreenHeader } from "../../components/ui";
import { DeniedState, EmptyState, ErrorState, OfflineState } from "../../components/states/Feedback";
import { ChildSwitcher } from "../parent/child-switcher";

type Card = {
  schoolName: string;
  studentName: string;
  classSection: string;
  academicYear: string;
  rows: { exam: string; subject: string; score: number; maxScore: number }[];
};

export function ReportCardScreen() {
  const { theme, acl, selectedChild } = useBranding();
  const router = useRouter();
  const isParent = Boolean(acl?.roles.includes("parent"));
  const [card, setCard] = useState<Card | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const data = await (await api()).exams.reportCard(
        isParent && selectedChild ? selectedChild.studentId : undefined,
      );
      setCard(data);
      setState(data.rows.length === 0 ? "empty" : "loaded");
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
      setMessage(e instanceof Error ? e.message : "Failed to load report card");
    }
  }, [isParent, selectedChild]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "denied") {
    return (
      <Screen scrollable={true}>
        <ScreenHeader title="Report card" showBack onBack={() => router.back()} />
        <View className="px-4 pt-4">
          <DeniedState title="You cannot view this report card" detail={message} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <ScreenHeader title="Report card" showBack onBack={() => router.back()} />
      {isParent ? (
        <View className="mt-1 px-4">
          <ChildSwitcher />
        </View>
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
          <EmptyState title="No published marks" detail="A report card appears after academic publish." />
        </View>
      ) : null}
      {state === "loaded" && card ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <AppText variant="title">{card.schoolName}</AppText>
          <AppText variant="label" style={{ marginTop: 8 }}>
            {card.studentName}
          </AppText>
          <AppText variant="caption">
            {card.classSection} · {card.academicYear}
          </AppText>
          {card.rows.map((r) => (
            <View key={`${r.exam}-${r.subject}`} className="mt-3 rounded-2xl bg-white p-3">
              <AppText variant="label">{r.exam}</AppText>
              <AppText variant="caption">
                {r.subject} · {r.score} / {r.maxScore}
              </AppText>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </Screen>
  );
}
