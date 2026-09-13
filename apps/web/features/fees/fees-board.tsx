"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import { Skeleton } from "../../components/ui/skeleton";

type Head = { id: string; name: string; amount: number };
type Student = { id: string; fullName: string; admissionNumber: string };
type Row = {
  id: string;
  amount: number;
  method: string;
  feeHeadName: string;
  studentName: string;
  receiptNumber: string | null;
  receiptId: string | null;
  createdAt: string;
};

export function FeesBoard() {
  const { acl } = useAppBranding();
  const canRead = acl.permissions.includes(PERMISSIONS.FEES_READ);
  const canRecord = acl.permissions.includes(PERMISSIONS.FEES_RECORD);
  const canStructure = acl.permissions.includes(PERMISSIONS.FEES_STRUCTURE_WRITE);
  const [heads, setHeads] = useState<Head[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState("");
  const [headName, setHeadName] = useState("");
  const [headAmount, setHeadAmount] = useState("12500");
  const [headError, setHeadError] = useState("");
  const [savingHead, setSavingHead] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [feeHeadId, setFeeHeadId] = useState("");
  const [amount, setAmount] = useState("12500");
  const [method, setMethod] = useState<"cash" | "upi" | "bank">("cash");
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [savingRecord, setSavingRecord] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");

  async function load() {
    if (!canRead) {
      setState("denied");
      setMessage("You do not have permission to view fees.");
      return;
    }
    setState("loading");
    setMessage("");
    try {
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
      setState(list.length === 0 && h.length === 0 ? "empty" : "loaded");
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
  }

  useEffect(() => {
    void load();
  }, []);

  async function searchStudents() {
    const list = await api().students.list({ q: q || undefined });
    setStudents(list);
    if (list[0]) setStudentId(list[0].id);
  }

  async function addHead() {
    const name = headName.trim();
    const amt = Number(headAmount);
    if (!name) {
      setHeadError("Enter a fee head name.");
      return;
    }
    if (!Number.isInteger(amt) || amt <= 0) {
      setHeadError("Amount must be a positive whole number.");
      return;
    }
    setSavingHead(true);
    setHeadError("");
    try {
      const h = await api().fees.createHead({ name, amount: amt });
      setHeads((prev) => [...prev, h]);
      setFeeHeadId(h.id);
      setAmount(String(h.amount));
      setHeadName("");
      setState("loaded");
      toast.success("Fee head saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Head failed";
      setHeadError(msg);
      toast.error(msg);
    } finally {
      setSavingHead(false);
    }
  }

  if (state === "denied") {
    return <PermissionDenied detail={message || "You cannot manage fees."} />;
  }
  if (state === "offline" || state === "error") {
    return <ErrorState message={message} onRetry={() => void load()} />;
  }
  if (state === "loading") {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <div>
      {canStructure ? (
        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex gap-2">
            <Input placeholder="Fee head name" value={headName} onChange={(e) => setHeadName(e.target.value)} />
            <Input value={headAmount} onChange={(e) => setHeadAmount(e.target.value)} />
            <Button variant="secondary" disabled={savingHead} onClick={() => void addHead()}>
              {savingHead ? "Saving…" : "Add head"}
            </Button>
          </div>
          {headError ? <p className="mt-2 text-sm text-danger">{headError}</p> : null}
          {heads.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No fee heads yet. Add a name and amount to start recording.</p>
          ) : null}
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
            {heads.length === 0 ? <option value="">No fee heads</option> : null}
            {heads.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div className="flex gap-2">
            {(["cash", "upi", "bank"] as const).map((m) => (
              <Button key={m} variant={method === m ? "primary" : "secondary" } onClick={() => setMethod(m)}>
                {m.toUpperCase()}
              </Button>
            ))}
          </div>
          <Input placeholder="Ref / note" value={note} onChange={(e) => setNote(e.target.value)} />
          <p className="text-sm text-slate-500">Receipt preview {preview || "—"}</p>
          {recordError ? <p className="text-sm text-danger md:col-span-2">{recordError}</p> : null}
          <Button
            disabled={savingRecord || !studentId || !feeHeadId}
            onClick={async () => {
              const amt = Number(amount);
              if (!studentId) {
                setRecordError("Select a student.");
                return;
              }
              if (!feeHeadId) {
                setRecordError("Select a fee head.");
                return;
              }
              if (!Number.isInteger(amt) || amt <= 0) {
                setRecordError("Amount must be a positive whole number.");
                return;
              }
              setSavingRecord(true);
              setRecordError("");
              try {
                const r = await api().fees.record({
                  studentId,
                  feeHeadId,
                  amount: amt,
                  method,
                  note: note || undefined,
                });
                toast.success(`Issued ${r.receiptNumber}`);
                await load();
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Record failed";
                setRecordError(msg);
                toast.error(msg);
              } finally {
                setSavingRecord(false);
              }
            }}
          >
            {savingRecord ? "Issuing…" : "Save & issue"}
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
                <td className="px-4 py-2">
                  {r.receiptId ? (
                    <Link className="text-primary underline" href={`/fees/receipts/${r.receiptId}`}>
                      {r.receiptNumber}
                    </Link>
                  ) : (
                    r.receiptNumber
                  )}
                </td>
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
