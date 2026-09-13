"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Download,
  Landmark,
  PlusCircle,
  Receipt,
  Search,
  X,
} from "lucide-react";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import { Skeleton } from "../../components/ui/skeleton";
import { PaymentMethodBadge } from "./receipt-detail";
import { downloadReceiptPdf } from "./download-receipt-pdf";

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
type StudentSummary = {
  studentId: string;
  studentName: string;
  headsTotal: number;
  paidTotal: number;
  dues: number;
};
type LastIssued = {
  receiptId: string;
  receiptNumber: string;
  studentName: string;
  amount: number;
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
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);

  const [studentSummary, setStudentSummary] = useState<StudentSummary | null>(null);
  const [loadingStudentSummary, setLoadingStudentSummary] = useState(false);

  const [savingRecord, setSavingRecord] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [lastIssued, setLastIssued] = useState<LastIssued | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
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
      setState("loaded");
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
  }, [canRead, canRecord, feeHeadId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Load student-specific dues summary when a student is selected
  useEffect(() => {
    if (!studentId || !canRead) {
      setStudentSummary(null);
      return;
    }
    let active = true;
    setLoadingStudentSummary(true);
    api()
      .fees.summary(studentId)
      .then((s) => {
        if (active) setStudentSummary(s);
      })
      .catch(() => {
        if (active) setStudentSummary(null);
      })
      .finally(() => {
        if (active) setLoadingStudentSummary(false);
      });
    return () => {
      active = false;
    };
  }, [studentId, canRead]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalHeadsAmount = heads.reduce((sum, h) => sum + h.amount, 0);
    const totalCollected = rows.reduce((sum, r) => sum + r.amount, 0);
    const receiptsCount = rows.filter((r) => r.receiptNumber).length;
    return { totalHeadsAmount, totalCollected, receiptsCount };
  }, [heads, rows]);

  async function searchStudents() {
    setSearchingStudents(true);
    setSearchedOnce(true);
    try {
      const list = await api().students.list({ q: q || undefined });
      setStudents(list);
      if (list[0]) {
        setStudentId(list[0].id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Student search failed");
    } finally {
      setSearchingStudents(false);
    }
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
      toast.success("Fee head saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Head creation failed";
      setHeadError(msg);
      toast.error(msg);
    } finally {
      setSavingHead(false);
    }
  }

  async function handleRowDownload(receiptId: string, receiptNumber: string) {
    setDownloadingId(receiptId);
    try {
      await downloadReceiptPdf(receiptId, receiptNumber);
      toast.success("Receipt PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  }

  async function recordPayment() {
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

      const selectedStudent = students.find((s) => s.id === studentId);
      const studentName = selectedStudent ? selectedStudent.fullName : "Student";

      // Refresh data
      const [updatedRows, updatedPreview] = await Promise.all([
        api().fees.list(),
        api().fees.previewNumber(),
      ]);
      setRows(updatedRows);
      setPreview(updatedPreview.preview);

      // Find new receipt
      const createdRow = updatedRows.find((x) => x.receiptNumber === r.receiptNumber);
      if (createdRow && createdRow.receiptId) {
        setLastIssued({
          receiptId: createdRow.receiptId,
          receiptNumber: r.receiptNumber,
          studentName,
          amount: amt,
        });
      }

      // Refresh student summary
      if (studentId) {
        const nextSummary = await api().fees.summary(studentId);
        setStudentSummary(nextSummary);
      }

      setNote("");
      toast.success(`Issued receipt ${r.receiptNumber}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Record failed";
      setRecordError(msg);
      toast.error(msg);
    } finally {
      setSavingRecord(false);
    }
  }

  if (state === "denied") {
    return <PermissionDenied detail={message || "You do not have permission to view fees."} />;
  }
  if (state === "offline") {
    return <ErrorState message="You appear to be offline." onRetry={() => void load()} />;
  }
  if (state === "error") {
    return <ErrorState message={message} onRetry={() => void load()} />;
  }

  if (state === "loading") {
    return (
      <div className="space-y-6">
        {/* KPI Skeletons */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        {/* Form Skeleton */}
        <Skeleton className="h-64 w-full rounded-2xl" />
        {/* Table Skeleton */}
        <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Overview KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Configured Heads</p>
            <p className="mt-2 font-display text-2xl font-bold text-ink">
              ₹{kpis.totalHeadsAmount.toLocaleString()}
            </p>
          </div>
          <p className="mt-2 text-xs text-slate-400">{heads.length} active fee heads</p>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Collections</p>
            <p className="mt-2 font-display text-2xl font-bold text-success">
              ₹{kpis.totalCollected.toLocaleString()}
            </p>
          </div>
          <p className="mt-2 text-xs text-slate-400">{kpis.receiptsCount} receipts issued</p>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Next Receipt Number</p>
            <p className="mt-2 font-display text-2xl font-bold text-primary">{preview || "—"}</p>
          </div>
          <p className="mt-2 text-xs text-slate-400">Sequential school-wide numbering</p>
        </Card>
      </div>

      {/* 2. Fee Head Structure Card (canStructure) */}
      {canStructure ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-700">Add Fee Head</h3>
            <span className="text-xs text-slate-400">School fee structure</span>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <Input
              placeholder="Fee head name (e.g. Term 1 Tuition)"
              value={headName}
              onChange={(e) => setHeadName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Amount (₹)"
              value={headAmount}
              onChange={(e) => setHeadAmount(e.target.value)}
              className="w-36"
            />
            <Button variant="secondary" disabled={savingHead} onClick={() => void addHead()}>
              <PlusCircle className="mr-1.5 h-4 w-4" />
              {savingHead ? "Saving…" : "Add Head"}
            </Button>
          </div>
          {headError ? <p className="mt-2 text-xs text-danger">{headError}</p> : null}
          {heads.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800">
              No fee heads configured yet. Add at least one fee head above to begin recording student payments.
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {heads.map((h) => (
                <span
                  key={h.id}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                >
                  <span className="font-medium">{h.name}</span>
                  <span className="ml-1.5 font-semibold text-slate-900">₹{h.amount}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* 3. Record Fee Payment Form (canRecord) */}
      {canRecord ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-slate-800">Record Fee Payment</h3>
            <span className="text-xs text-slate-400">Cash / UPI / Bank · No gateway</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Student Search & Select */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-medium text-slate-600">Find Student</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search by student admission number or name…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <Button variant="secondary" disabled={searchingStudents} onClick={() => void searchStudents()}>
                  <Search className="mr-1.5 h-4 w-4" />
                  {searchingStudents ? "Searching…" : "Search"}
                </Button>
              </div>
              {searchedOnce && students.length === 0 && !searchingStudents ? (
                <p className="text-xs text-amber-600">No students found matching &quot;{q}&quot;.</p>
              ) : null}
            </div>

            {/* Student Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Select Student</label>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-primary focus:outline-none"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              >
                <option value="">Choose a student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.admissionNumber} — {s.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Fee Head Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Fee Head</label>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-primary focus:outline-none"
                value={feeHeadId}
                onChange={(e) => {
                  setFeeHeadId(e.target.value);
                  const h = heads.find((x) => x.id === e.target.value);
                  if (h) setAmount(String(h.amount));
                }}
              >
                {heads.length === 0 ? <option value="">No fee heads available</option> : null}
                {heads.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} (₹{h.amount})
                  </option>
                ))}
              </select>
            </div>

            {/* Student Dues Card Preview (when student selected) */}
            {studentId ? (
              <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs md:col-span-2">
                {loadingStudentSummary ? (
                  <Skeleton className="h-4 w-48" />
                ) : studentSummary ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-700">
                      {studentSummary.studentName}: Paid ₹{studentSummary.paidTotal} of ₹
                      {studentSummary.headsTotal}
                    </span>
                    <span
                      className={`font-semibold ${
                        studentSummary.dues === 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {studentSummary.dues === 0 ? "No dues" : `Outstanding dues: ₹${studentSummary.dues}`}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Amount (₹)</label>
              <Input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Payment Method Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Payment Method</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={method === "cash" ? "primary" : "secondary"}
                  onClick={() => setMethod("cash")}
                  className="flex-1"
                >
                  <Banknote className="mr-1.5 h-4 w-4" />
                  CASH
                </Button>
                <Button
                  type="button"
                  variant={method === "upi" ? "primary" : "secondary"}
                  onClick={() => setMethod("upi")}
                  className="flex-1"
                >
                  <CreditCard className="mr-1.5 h-4 w-4" />
                  UPI
                </Button>
                <Button
                  type="button"
                  variant={method === "bank" ? "primary" : "secondary"}
                  onClick={() => setMethod("bank")}
                  className="flex-1"
                >
                  <Landmark className="mr-1.5 h-4 w-4" />
                  BANK
                </Button>
              </div>
            </div>

            {/* Reference Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Reference / Note (Optional)</label>
              <Input
                placeholder="UPI ref, Cheque no., or note…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Receipt Preview & Submit Button */}
            <div className="flex flex-col justify-end space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Next Receipt Preview:</span>
                <span className="font-semibold text-primary">{preview || "—"}</span>
              </div>
              <Button
                disabled={savingRecord || !studentId || !feeHeadId || heads.length === 0}
                onClick={() => void recordPayment()}
                className="w-full"
              >
                <Receipt className="mr-1.5 h-4 w-4" />
                {savingRecord ? "Issuing Receipt…" : "Save & Issue Receipt"}
              </Button>
            </div>

            {recordError ? <p className="text-xs text-danger md:col-span-2">{recordError}</p> : null}
          </div>
        </div>
      ) : null}

      {/* 4. Last Issued Receipt Inline Success Banner */}
      {lastIssued ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-success" />
            <div>
              <p className="font-semibold text-emerald-950">
                Receipt {lastIssued.receiptNumber} issued successfully
              </p>
              <p className="text-xs text-emerald-800">
                ₹{lastIssued.amount} recorded for {lastIssued.studentName}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/fees/receipts/${lastIssued.receiptId}`}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              View Receipt
            </Link>
            <Button
              variant="secondary"
              className="h-8 border-emerald-200 text-xs text-emerald-900"
              onClick={() => void handleRowDownload(lastIssued.receiptId, lastIssued.receiptNumber)}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Download PDF
            </Button>
            <button
              onClick={() => setLastIssued(null)}
              className="p-1 text-emerald-700 hover:text-emerald-900"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* 5. Payments List / Empty State */}
      {rows.length === 0 ? (
        <EmptyState
          title="No payments recorded"
          detail="Record a cash, UPI, or bank payment above to issue the first receipt."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-display text-base font-semibold text-slate-800">Recent Transactions</h3>
            <p className="text-xs text-slate-400">School receipt log · Monotonic numbering</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Receipt</th>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Head</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium">
                      {r.receiptId ? (
                        <Link
                          className="font-semibold text-primary hover:underline"
                          href={`/fees/receipts/${r.receiptId}`}
                        >
                          {r.receiptNumber}
                        </Link>
                      ) : (
                        r.receiptNumber ?? "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink">{r.studentName}</td>
                    <td className="px-5 py-3.5 text-slate-600">{r.feeHeadName}</td>
                    <td className="px-5 py-3.5 font-semibold text-ink">₹{r.amount}</td>
                    <td className="px-5 py-3.5">
                      <PaymentMethodBadge method={r.method} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {r.receiptId && r.receiptNumber ? (
                        <Button
                          variant="ghost"
                          className="h-8 px-2.5 text-xs text-primary"
                          disabled={downloadingId === r.receiptId}
                          onClick={() => void handleRowDownload(r.receiptId!, r.receiptNumber!)}
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                          {downloadingId === r.receiptId ? "…" : "PDF"}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
