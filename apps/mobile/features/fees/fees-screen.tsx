import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { Screen, ScreenHeader } from "../../components/ui";
import { DeniedState, EmptyState, ErrorState, OfflineState } from "../../components/states/Feedback";
import { ChildSwitcher } from "../parent/child-switcher";
import { getCachedFees, setCachedFees, type CachedFeeRow, type CachedSummary } from "./fees-cache";

export function PaymentMethodPill({ method }: { method: string }) {
  const m = method.toLowerCase();
  let bg = "#64748b";
  if (m === "cash") bg = "#16a34a";
  else if (m === "upi") bg = "#0b3a6e";
  else if (m === "bank") bg = "#d97706";

  return (
    <View style={{ backgroundColor: bg }} className="rounded-full px-2.5 py-0.5">
      <AppText variant="caption" color="#ffffff">
        {method.toUpperCase()}
      </AppText>
    </View>
  );
}

export function FeesScreen() {
  const { theme, acl, activeRole, selectedChild } = useBranding();
  const router = useRouter();
  const isParent = Boolean(acl?.roles.includes("parent"));
  const isStudent = Boolean(acl?.roles.includes("student"));
  const canRead = Boolean(acl?.permissions.includes(PERMISSIONS.FEES_READ));
  const canReceipt = Boolean(acl?.permissions.includes(PERMISSIONS.RECEIPTS_READ));

  const [rows, setRows] = useState<CachedFeeRow[]>([]);
  const [summary, setSummary] = useState<CachedSummary | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [isCachedData, setIsCachedData] = useState(false);
  const [cachedTime, setCachedTime] = useState<string | null>(null);

  const activeStudentId = isParent ? selectedChild?.studentId : undefined;
  const schoolId = acl?.schoolId;
  const userId = acl?.userId;
  const role =
    activeRole ?? (acl?.roles?.length === 1 ? acl.roles[0] : null);
  const childId = isParent ? activeStudentId : undefined;

  const load = useCallback(async (isPullToRefresh = false) => {
    if (!canRead) {
      setState("denied");
      setMessage("You do not have permission to view fees.");
      return;
    }

    if (isParent && !selectedChild) {
      setRows([]);
      setSummary(null);
      setState("empty");
      setMessage("No linked children found. Please contact the school office.");
      return;
    }

    if (isPullToRefresh) {
      setRefreshing(true);
    } else {
      setState("loading");
    }
    setMessage("");

    if (!schoolId || !userId || !role) {
      setState("error");
      setMessage("Session context is incomplete. Please sign in again.");
      return;
    }

    try {
      const client = await api();
      const [list, nextSummary] = await Promise.all([
        client.fees.list(activeStudentId),
        client.fees.summary(activeStudentId),
      ]);

      setRows(list);
      setSummary(nextSummary);
      setIsCachedData(false);
      setCachedTime(null);

      // Persist to offline cache
      void setCachedFees(schoolId, userId, role, { summary: nextSummary, rows: list }, childId);

      if (list.length === 0 && nextSummary.headsTotal === 0) {
        setState("empty");
      } else {
        setState("loaded");
      }
    } catch (e) {
      // Check offline fallback cache
      const cached = await getCachedFees(schoolId, userId, role, childId);
      if (cached) {
        setRows(cached.rows);
        setSummary(cached.summary);
        setIsCachedData(true);
        setCachedTime(new Date(cached.cachedAt).toLocaleTimeString());
        setState("loaded");
        return;
      }

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
    } finally {
      if (isPullToRefresh) {
        setRefreshing(false);
      }
    }
  }, [canRead, isParent, selectedChild, activeStudentId, schoolId, userId, role, childId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "denied") {
    return (
      <Screen scrollable={true}>
        <ScreenHeader
          title={isStudent ? "My Fees & Dues" : "Fees & Receipts"}
          showBack
          onBack={() => router.back()}
        />
        <View className="px-4 pt-4">
          <DeniedState title="You cannot view these fees" detail={message} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <ScreenHeader
        title={isStudent ? "My Fees & Dues" : "Fees & Receipts"}
        showBack
        onBack={() => router.back()}
      />

      {/* Child Switcher for Parents */}
      {isParent ? (
        <View className="mt-1 px-4">
          <ChildSwitcher />
        </View>
      ) : null}

      {/* Offline cached indicator banner */}
      {isCachedData ? (
        <View className="mx-4 mt-3 flex-row items-center justify-between rounded-xl bg-amber-50 p-3 border border-amber-200">
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color="#92400e">
              Offline — Showing cached details{cachedTime ? ` from ${cachedTime}` : ""}
            </AppText>
          </View>
          <Pressable onPress={() => void load(true)} className="ml-2 rounded-lg bg-amber-600 px-2.5 py-1">
            <AppText variant="caption" color="#ffffff">
              Retry
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {/* State views */}
      {state === "loading" && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : null}

      {state === "offline" && !isCachedData ? (
        <OfflineState onRetry={() => void load()} />
      ) : null}

      {state === "error" && !isCachedData ? (
        <ErrorState message={message} onRetry={() => void load()} />
      ) : null}

      {/* Dedicated empty states */}
      {state === "empty" ? (
        <View className="p-4">
          {isParent && !selectedChild ? (
            <EmptyState
              title="No Linked Child"
              detail="Select a child above or contact the school office to link your student account."
            />
          ) : summary && summary.headsTotal === 0 ? (
            <EmptyState
              title="No Fees Assigned"
              detail="No fee structure has been assigned for this student yet."
            />
          ) : (
            <EmptyState
              title="No Fees"
              detail="No fee heads or receipts for this student yet."
            />
          )}
        </View>
      ) : null}

      {/* Loaded State */}
      {state === "loaded" && summary ? (
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
          {/* Dues Status Card */}
          <View className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <AppText variant="label">{summary.studentName}</AppText>
              <View
                style={{
                  backgroundColor: summary.dues === 0 ? "#16a34a" : "#dc2626",
                }}
                className="rounded-full px-3 py-1"
              >
                <AppText variant="caption" color="#ffffff">
                  {summary.dues === 0 ? "No dues" : `Dues: ₹${summary.dues}`}
                </AppText>
              </View>
            </View>

            <View className="mt-3 flex-row items-baseline justify-between border-t border-slate-100 pt-3">
              <View>
                <AppText variant="caption" color="#64748b">
                  Total Fees
                </AppText>
                <AppText variant="label" style={{ marginTop: 2 }}>
                  ₹{summary.headsTotal}
                </AppText>
              </View>
              <View>
                <AppText variant="caption" color="#64748b">
                  Total Paid
                </AppText>
                <AppText variant="label" color="#16a34a" style={{ marginTop: 2 }}>
                  ₹{summary.paidTotal}
                </AppText>
              </View>
              <View>
                <AppText variant="caption" color="#64748b">
                  Outstanding
                </AppText>
                <AppText
                  variant="label"
                  color={summary.dues === 0 ? "#16a34a" : "#dc2626"}
                  style={{ marginTop: 2 }}
                >
                  ₹{summary.dues}
                </AppText>
              </View>
            </View>
          </View>

          {/* Receipts List */}
          <AppText variant="label" style={{ marginBottom: 8, color: "#64748b" }}>
            Payment History
          </AppText>

          {rows.length === 0 ? (
            <View className="rounded-2xl bg-white p-6 items-center">
              <AppText variant="label">No payment receipts yet</AppText>
              <AppText variant="caption" style={{ marginTop: 4, textAlign: "center" }}>
                {summary.dues > 0
                  ? `Outstanding dues: ₹${summary.dues}. Receipts will appear here once recorded by the school.`
                  : "Receipts will appear here after the school records your payments."}
              </AppText>
            </View>
          ) : (
            rows.map((r) => (
              <Pressable
                key={r.id}
                disabled={!canReceipt || !r.receiptId}
                onPress={() => r.receiptId && router.push(`/receipts/${r.receiptId}`)}
                className="mb-3 rounded-2xl bg-white p-4 shadow-sm"
              >
                <View className="flex-row items-center justify-between">
                  <AppText variant="label" color={theme.colors.primary}>
                    {r.receiptNumber ?? "Receipt Pending"}
                  </AppText>
                  <PaymentMethodPill method={r.method} />
                </View>

                <View className="mt-2 flex-row items-center justify-between">
                  <AppText variant="caption" color="#334155">
                    {r.feeHeadName}
                  </AppText>
                  <AppText variant="label">₹{r.amount}</AppText>
                </View>

                <View className="mt-2 border-t border-slate-100 pt-2 flex-row justify-between items-center">
                  <AppText variant="caption" color="#94a3b8">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </AppText>
                  {r.receiptId ? (
                    <AppText variant="caption" color={theme.colors.primary}>
                      View Receipt →
                    </AppText>
                  ) : null}
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      ) : null}
    </Screen>
  );
}
