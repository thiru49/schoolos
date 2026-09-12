import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { PERMISSIONS, type AttendanceStatus } from "@schoolos/permissions";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";

type Row = { studentId: string; fullName: string; admissionNumber?: string; date?: string; status: string | null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceScreen() {
  const { theme, acl } = useBranding();
  const router = useRouter();
  const canMark = acl?.permissions.includes(PERMISSIONS.ATTENDANCE_MARK);
  const isParent = acl?.roles.includes("parent");
  const isStudent = acl?.roles.includes("student");
  const [rows, setRows] = useState<Row[]>([]);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const client = await api();
        if (isParent) {
          const children = await client.me.children();
          const child = children[0];
          if (!child) {
            setError("No linked children — contact school office");
            setLoading(false);
            return;
          }
          setLabel(child.fullName);
          const data = await client.attendanceApi.list({ studentId: child.studentId });
          setRows(data.records);
          setLoading(false);
          return;
        }
        if (isStudent) {
          const self = acl?.scopes.find((s) => s.type === "self")?.studentId;
          if (!self) {
            setError("No student scope");
            setLoading(false);
            return;
          }
          const data = await client.attendanceApi.list({ studentId: self });
          setRows(data.records);
          setLabel("My attendance");
          setLoading(false);
          return;
        }
        const sections = await client.academics.sections();
        const first = sections[0];
        if (!first) {
          setError("No classes in scope");
          setLoading(false);
          return;
        }
        setSectionId(first.id);
        setLabel(first.label);
        const roster = await client.attendanceApi.roster(first.id, today());
        setRows(roster.rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [acl, isParent, isStudent]);

  function setStatus(studentId: string, status: AttendanceStatus) {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  }

  async function save() {
    if (!sectionId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const client = await api();
      const marks = rows
        .filter((r) => r.status)
        .map((r) => ({ studentId: r.studentId, status: r.status as AttendanceStatus }));
      if (marks.length === 0) {
        setError("Mark at least one student");
        setSaving(false);
        return;
      }
      await client.attendanceApi.mark({ sectionId, date: today(), marks });
      setSuccess("Attendance saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: 56 }}>
      <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 16 }}>
        <Text>Back</Text>
      </Pressable>
      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.colors.primary, paddingHorizontal: 16, marginTop: 8 }}>
        Attendance · {label}
      </Text>
      {error ? <Text style={{ color: theme.colors.danger, padding: 16 }}>{error}</Text> : null}
      {success ? <Text style={{ color: theme.colors.success, padding: 16 }}>{success}</Text> : null}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {rows.length === 0 ? <Text>No records</Text> : null}
        {rows.map((r, idx) => (
          <View key={`${r.studentId}-${r.date ?? idx}`} style={{ backgroundColor: "white", borderRadius: 12, padding: 12, marginBottom: 8 }}>
            <Text style={{ fontWeight: "600" }}>{r.fullName}</Text>
            <Text style={{ color: "#64748b", fontSize: 12 }}>{r.date ?? r.admissionNumber}</Text>
            {canMark ? (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                {(["P", "A", "L", "H"] as AttendanceStatus[]).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(r.studentId, s)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: r.status === s ? theme.colors.primary : "#e2e8f0",
                    }}
                  >
                    <Text style={{ color: r.status === s ? "white" : "#0f172a" }}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={{ marginTop: 8 }}>{r.status ?? "Not marked"}</Text>
            )}
          </View>
        ))}
      </ScrollView>
      {canMark ? (
        <Pressable
          onPress={() => void save()}
          disabled={saving}
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 24,
            backgroundColor: theme.colors.primary,
            padding: 16,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
            {saving ? "Saving…" : "Submit attendance"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
