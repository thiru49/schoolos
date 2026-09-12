import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { EmptyState, ErrorState } from "../../components/states/Feedback";

type Row = {
  id: string;
  amount: number;
  method: string;
  feeHeadName: string;
  receiptNumber: string | null;
  createdAt: string;
};

export function FeesScreen() {
  const { theme, acl, selectedChild } = useBranding();
  const router = useRouter();
  const isParent = acl?.roles.includes("parent");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(
        await (await api()).fees.list(isParent && selectedChild ? selectedChild.studentId : undefined),
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load fees");
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
          Fees
        </AppText>
      </View>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {rows.length === 0 && !error ? (
        <View className="p-4">
          <EmptyState title="No fees" detail="No receipts for this student yet." />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {rows.map((r) => (
            <View key={r.id} className="mb-2 rounded-2xl bg-white p-4">
              <AppText variant="label">{r.receiptNumber ?? "—"}</AppText>
              <AppText variant="caption">
                {r.feeHeadName} · ₹{r.amount} · {r.method}
              </AppText>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
