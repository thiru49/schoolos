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

type Row = {
  id: string;
  amount: number;
  method: string;
  feeHeadName: string;
  receiptNumber: string | null;
  receiptId: string | null;
  createdAt: string;
};

type Summary = {
  studentId: string;
  studentName: string;
  headsTotal: number;
  paidTotal: number;
  dues: number;
};

export function FeesScreen() {
  const { theme, acl, selectedChild } = useBranding();
  const router = useRouter();
  const isParent = Boolean(acl?.roles.includes("parent"));
  const canRead = Boolean(acl?.permissions.includes(PERMISSIONS.FEES_READ));
  const canReceipt = Boolean(acl?.permissions.includes(PERMISSIONS.RECEIPTS_READ));
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!canRead) {
      setState("denied");
      setMessage("You do not have permission to view fees.");
      return;
    }
    if (isParent && !selectedChild) {
      setRows([]);
      setSummary(null);
      setState("empty");
      return;
    }
    setState("loading");
    setMessage("");
    try {
      const studentId = isParent && selectedChild ? selectedChild.studentId : undefined;
      const client = await api();
      const [list, nextSummary] = await Promise.all([
        client.fees.list(studentId),
        client.fees.summary(studentId),
      ]);
      setRows(list);
      setSummary(nextSummary);
      setState(list.length === 0 && nextSummary.headsTotal === 0 ? "empty" : "loaded");
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
      setMessage(e instanceof Error ? e.message : "Failed to load fees");
    }
  }, [canRead, isParent, selectedChild]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "denied") {
    return (
      <View className="flex-1 px-4 pt-16" style={{ backgroundColor: theme.colors.background }}>
        <DeniedState title="You cannot view these fees" detail={message} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background, paddingTop: 56 }}>
      <View className="px-4">
        <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
        <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 12 }}>
          Fees
        </AppText>
      </View>
      {isParent ? (
        <View className="mt-3 px-4">
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
          <EmptyState title="No fees" detail="No fee heads or receipts for this student yet." />
        </View>
      ) : null}
      {state === "loaded" && summary ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View className="mb-4 rounded-2xl bg-white p-4">
            <AppText variant="label">{summary.studentName}</AppText>
            <AppText variant="caption">
              Paid ₹{summary.paidTotal} of ₹{summary.headsTotal}
            </AppText>
            <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 8 }}>
              {summary.dues === 0 ? "No dues" : `Dues ₹${summary.dues}`}
            </AppText>
          </View>
          {rows.length === 0 ? (
            <EmptyState title="No receipts" detail="Payments will appear here after the school records them." />
          ) : (
            rows.map((r) => (
              <Pressable
                key={r.id}
                disabled={!canReceipt || !r.receiptId}
                onPress={() => r.receiptId && router.push(`/receipts/${r.receiptId}`)}
                className="mb-2 rounded-2xl bg-white p-4"
              >
                <AppText variant="label">{r.receiptNumber ?? "—"}</AppText>
                <AppText variant="caption">
                  {r.feeHeadName} · ₹{r.amount} · {r.method}
                </AppText>
              </Pressable>
            ))
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}
