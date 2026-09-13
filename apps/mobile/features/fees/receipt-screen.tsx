import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { DeniedState, EmptyState, ErrorState, OfflineState } from "../../components/states/Feedback";
import { PaymentMethodPill } from "./fees-screen";
import { downloadMobileReceiptPdf, shareMobileReceipt } from "./mobile-receipt-pdf";

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
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [localPdfUri, setLocalPdfUri] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!canRead) {
      setState("denied");
      setMessage("You do not have permission to view receipts.");
      return;
    }
    if (!id) {
      setState("empty");
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setState("loading");
    }
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
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  }, [canRead, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDownloadPdf() {
    if (!receipt) return;
    setDownloading(true);
    try {
      const uri = await downloadMobileReceiptPdf(receipt.id, receipt.number);
      setLocalPdfUri(uri);
      Alert.alert(
        "Receipt Downloaded",
        `Receipt PDF saved to device cache.\n\nFile: receipt-${receipt.number.replace(/\//g, "-")}.pdf`,
        [
          { text: "OK" },
          {
            text: "Share",
            onPress: () => {
              void shareMobileReceipt(receipt, uri);
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert("Download Failed", e instanceof Error ? e.message : "Could not download receipt PDF");
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    if (!receipt) return;
    try {
      await shareMobileReceipt(receipt, localPdfUri ?? undefined);
    } catch (e) {
      Alert.alert("Share Failed", e instanceof Error ? e.message : "Could not share receipt");
    }
  }

  if (state === "denied") {
    return (
      <View className="flex-1 px-4 pt-16" style={{ backgroundColor: theme.colors.background }}>
        <DeniedState title="You cannot view this receipt" detail={message} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background, paddingTop: 56 }}>
      {/* Header */}
      <View className="px-4">
        <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
        <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 12 }}>
          Receipt Details
        </AppText>
      </View>

      {state === "loading" && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={theme.colors.primary}
            />
          }
        >
          {/* Main Receipt Card */}
          <View className="rounded-2xl bg-white p-5 shadow-sm">
            {/* Top Branding & Status */}
            <View className="flex-row items-start justify-between border-b border-slate-100 pb-4">
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color="#64748b">
                  {branding?.schoolName ?? "SchoolOS"}
                </AppText>
                <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 4 }}>
                  {receipt.number}
                </AppText>
              </View>
              <View className="items-end gap-1.5">
                <PaymentMethodPill method={receipt.method} />
                <View className="rounded-full bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                  <AppText variant="caption" color="#16a34a">
                    PAID
                  </AppText>
                </View>
              </View>
            </View>

            {/* Details Fields */}
            <View className="mt-4 space-y-3">
              <View className="rounded-xl bg-slate-50 p-3">
                <AppText variant="caption" color="#64748b">
                  Student
                </AppText>
                <AppText variant="label" style={{ marginTop: 2 }}>
                  {receipt.studentName} · {receipt.admissionNumber}
                </AppText>
              </View>

              <View className="rounded-xl bg-slate-50 p-3">
                <AppText variant="caption" color="#64748b">
                  Fee Head
                </AppText>
                <AppText variant="label" style={{ marginTop: 2 }}>
                  {receipt.feeHead}
                </AppText>
              </View>

              <View className="rounded-xl bg-slate-50 p-3 flex-row items-center justify-between">
                <View>
                  <AppText variant="caption" color="#64748b">
                    Amount Paid
                  </AppText>
                  <AppText variant="title" color={theme.colors.primary} style={{ marginTop: 2 }}>
                    ₹{receipt.amount}
                  </AppText>
                </View>
                <PaymentMethodPill method={receipt.method} />
              </View>

              <View className="rounded-xl bg-slate-50 p-3">
                <AppText variant="caption" color="#64748b">
                  Date & Time Recorded
                </AppText>
                <AppText variant="label" style={{ marginTop: 2 }}>
                  {new Date(receipt.createdAt).toLocaleString()}
                </AppText>
              </View>

              {receipt.note ? (
                <View className="rounded-xl bg-slate-50 p-3">
                  <AppText variant="caption" color="#64748b">
                    Note / Reference
                  </AppText>
                  <AppText variant="caption" style={{ marginTop: 2 }}>
                    {receipt.note}
                  </AppText>
                </View>
              ) : null}
            </View>

            {/* Actions Bar */}
            <View className="mt-6 gap-3">
              <AppButton
                label={downloading ? "Downloading PDF…" : localPdfUri ? "Download Again" : "Download PDF"}
                variant="primary"
                onPress={() => void handleDownloadPdf()}
              />
              <AppButton
                label="Share Receipt"
                variant="secondary"
                onPress={() => void handleShare()}
              />
            </View>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}
