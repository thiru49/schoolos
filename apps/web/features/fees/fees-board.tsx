"use client";

import { useEffect, useState } from "react";
import { PERMISSIONS } from "@schoolos/permissions";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/states/empty-state";

type Head = { id: string; name: string; amount: number };
type Student = { id: string; fullName: string; admissionNumber: string };
type Row = {
  id: string;
  amount: number;
  method: string;
  feeHeadName: string;
  studentName: string;
  receiptNumber: string | null;
  createdAt: string;
};

export function FeesBoard() {
  const { acl } = useAppBranding();
  const canRecord = acl.permissions.includes(PERMISSIONS.FEES_RECORD);
  const canStructure = acl.permissions.includes(PERMISSIONS.FEES_STRUCTURE_WRITE);
  const [heads, setHeads] = useState<Head[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState("");
  const [headName, setHeadName] = useState("");
  const [headAmount, setHeadAmount] = useState("12500");
  const [studentId, setStudentId] = useState("");
  const [feeHeadId, setFeeHeadId] = useState("");
  const [amount, setAmount] = useState("12500");
  const [method, setMethod] = useState<"cash" | "upi" | "bank">("cash");
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    const [h, p, list] = await Promise.all([
      api().fees.heads(),
      canRecord ? api().fees.previewNumber() : Promise.resolve({ preview: "" }),
      api().fees.list(),
    ]);
    setHeads(h);
    if (h[0] && !feeHeadId) {
      setFeeHeadId(h[0].id);
      setAmount(String(h[0].amount));
    }
    setPreview(p.preview);
    setRows(list);
  }

  useEffect(() => {
    void load();
  }, []);

  async function searchStudents() {
    const list = await api().students.list({ q: q || undefined });
    setStudents(list);
    if (list[0]) setStudentId(list[0].id);
  }

  return (
    <div>
      {canStructure ? (
        <div className="mb-4 flex gap-2 rounded-2xl bg-white p-4 shadow-sm">
          <Input placeholder="Fee head name" value={headName} onChange={(e) => setHeadName(e.target.value)} />
          <Input value={headAmount} onChange={(e) => setHeadAmount(e.target.value)} />
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                const h = await api().fees.createHead({ name: headName, amount: Number(headAmount) });
                setHeads((prev) => [...prev, h]);
                setFeeHeadId(h.id);
                setHeadName("");
                toast.success("Fee head saved");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Head failed");
              }
            }}
          >
            Add head
          </Button>
        </div>
      ) : null}
      {canRecord ? (
        <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-2">
          <div className="flex gap-2 md:col-span-2">
            <Input placeholder="Search student id or name" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button variant="secondary" onClick={() => void searchStudents()}>
              Search
            </Button>
          </div>
          <select className="h-10 rounded-lg border px-3 text-sm" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Select student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.admissionNumber} {s.fullName}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-lg border px-3 text-sm"
            value={feeHeadId}
            onChange={(e) => {
              setFeeHeadId(e.target.value);
              const h = heads.find((x) => x.id === e.target.value);
              if (h) setAmount(String(h.amount));
            }}
          >
            {heads.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div className="flex gap-2">
            {(["cash", "upi", "bank"] as const).map((m) => (
              <Button key={m} variant={method === m ? "primary" : "secondary"} onClick={() => setMethod(m)}>
                {m.toUpperCase()}
              </Button>
            ))}
          </div>
          <Input placeholder="Ref / note" value={note} onChange={(e) => setNote(e.target.value)} />
          <p className="text-sm text-slate-500">Receipt preview {preview || "—"}</p>
          <Button
            onClick={async () => {
              try {
                const r = await api().fees.record({
                  studentId,
                  feeHeadId,
                  amount: Number(amount),
                  method,
                  note: note || undefined,
                });
                toast.success(`Issued ${r.receiptNumber}`);
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Record failed");
              }
            }}
          >
            Save & issue
          </Button>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No payments" detail="Record a cash, UPI, or bank payment to issue a receipt." />
        </div>
      ) : (
        <table className="mt-6 w-full overflow-hidden rounded-2xl bg-white text-left text-sm shadow-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-4 py-2">Receipt</th>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Head</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Method</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.receiptNumber}</td>
                <td className="px-4 py-2">{r.studentName}</td>
                <td className="px-4 py-2">{r.feeHeadName}</td>
                <td className="px-4 py-2">₹{r.amount}</td>
                <td className="px-4 py-2">{r.method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
