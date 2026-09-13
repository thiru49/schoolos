import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { DeniedState, EmptyState, ErrorState, OfflineState } from "../../components/states/Feedback";

type Receipt = {
  id: string;
  number: string;
  amount: number;
  method: string;
  feeHead: string;
  studentName: string;
  admissionNumber: string;
  createdAt: string;
  note: string | null;
};

export function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, branding, acl } = useBranding();
  const router = useRouter();
  const canRead = Boolean(acl?.permissions.includes(PERMISSIONS.RECEIPTS_READ));
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!canRead) {
      setState("denied");
      setMessage("You do not have permission to view receipts.");
      return;
    }
    if (!id) {
      setState("empty");
      return;
    }
    setState("loading");
    setMessage("");
    try {
      const data = await (await api()).fees.receipt(id);
      setReceipt(data);
      setState("loaded");
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setState("denied");
        setMessage(e.message);
        return;
      }
      if (e instanceof ApiError && e.status === 404) {
        setState("empty");
        return;
      }
      if (e instanceof TypeError) {
        setState("offline");
        setMessage("You appear to be offline.");
        return;
      }
      setState("error");
      setMessage(e instanceof Error ? e.message : "Failed to load receipt");
    }
  }, [canRead, id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "denied") {
    return (
      <View className="flex-1 px-4 pt-16" style={{ backgroundColor: theme.colors.background }}>
        <DeniedState title="You cannot view this receipt" detail={message} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background, paddingTop: 56 }}>
      <View className="px-4">
        <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
        <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 12 }}>
          Receipt
        </AppText>
      </View>
      {state === "loading" ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : null}
      {state === "offline" ? <OfflineState onRetry={() => void load()} /> : null}
      {state === "error" ? <ErrorState message={message} onRetry={() => void load()} /> : null}
      {state === "empty" ? (
        <View className="p-4">
          <EmptyState title="Receipt not found" detail="This receipt is missing or is not for this student." />
        </View>
      ) : null}
      {state === "loaded" && receipt ? (
        <View className="m-4 rounded-2xl bg-white p-4">
          <AppText variant="caption">{branding?.schoolName}</AppText>
          <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 8 }}>
            {receipt.number}
          </AppText>
          <AppText variant="label" style={{ marginTop: 12 }}>
            {receipt.studentName} · {receipt.admissionNumber}
          </AppText>
          <AppText variant="caption" style={{ marginTop: 8 }}>
            {receipt.feeHead} · ₹{receipt.amount} · {receipt.method}
          </AppText>
          {receipt.note ? (
            <AppText variant="caption" style={{ marginTop: 8 }}>
              {receipt.note}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
