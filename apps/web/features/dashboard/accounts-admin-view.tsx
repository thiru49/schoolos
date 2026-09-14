"use client";

import Link from "next/link";
import {
  Banknote,
  Receipt,
  FileBarChart,
  PlusCircle,
  ArrowRight,
  CreditCard,
  Building2,
  Coins,
} from "lucide-react";
import { Card, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

export interface AccountsPaymentItem {
  id: string;
  amount: number;
  method: string;
  feeHeadName: string;
  studentName: string;
  admissionNumber: string;
  receiptNumber: string | null;
  createdAt: string;
}

export interface AccountsAdminData {
  feeHeads: { id: string; name: string; amount: number }[];
  recentPayments: AccountsPaymentItem[];
}

export function AccountsAdminView({ data }: { data: AccountsAdminData }) {
  const heads = data.feeHeads;
  const payments = data.recentPayments;

  return (
    <div className="space-y-6">
      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col justify-between">
          <div>
            <CardTitle>Configured Fee Heads</CardTitle>
            <p className="mt-2 font-display text-2xl font-semibold text-primary">
              {heads.length}
            </p>
          </div>
          <Link
            href="/fees"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Manage Fee Heads <ArrowRight size={12} />
          </Link>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <CardTitle>Recorded Payment Entries</CardTitle>
            <p className="mt-2 font-display text-2xl font-semibold text-slate-900">
              {payments.length}
            </p>
          </div>
          <Link
            href="/reports/payments"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Audit Log <ArrowRight size={12} />
          </Link>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <CardTitle>Fee Collection Report</CardTitle>
            <p className="mt-2 text-sm text-slate-600">
              Class & head-wise dues & collections
            </p>
          </div>
          <Link
            href="/reports/fee-collection"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Generate Report <ArrowRight size={12} />
          </Link>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <CardTitle>Fast Actions</CardTitle>
            <p className="mt-2 text-sm text-slate-600">
              Record new tuition / bus fees
            </p>
          </div>
          <Link
            href="/fees"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Record Payment <ArrowRight size={12} />
          </Link>
        </Card>
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col justify-between border-slate-200">
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 mb-3">
              <Banknote size={18} />
            </div>
            <h4 className="font-display text-sm font-semibold text-slate-900">
              Fee Collection Desk
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Search by admission number, select fee head, and record payments via Cash, UPI, or Bank Transfer.
            </p>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
            <Link
              href="/fees"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              Open Fee Collection Desk <ArrowRight size={12} />
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col justify-between border-slate-200">
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
              <Receipt size={18} />
            </div>
            <h4 className="font-display text-sm font-semibold text-slate-900">
              Fee Collection & Dues Report
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Generate detailed class-level fee collection percentages, outstanding dues, and export CSVs.
            </p>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
            <Link
              href="/reports/fee-collection"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              View Fee Collection Report <ArrowRight size={12} />
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col justify-between border-slate-200">
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-3">
              <FileBarChart size={18} />
            </div>
            <h4 className="font-display text-sm font-semibold text-slate-900">
              Payment Transaction Ledger
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Full transaction history with payment timestamps, method breakdown, and receipt numbers.
            </p>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
            <Link
              href="/reports/payments"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              View Payment Ledger <ArrowRight size={12} />
            </Link>
          </div>
        </Card>
      </div>

      {/* Configured Fee Heads & Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Fee Heads */}
        <Card className="border-slate-200 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <CardTitle>Configured Fee Heads</CardTitle>
            <Badge variant="muted">{heads.length} Total</Badge>
          </div>
          {heads.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">
              No fee heads configured. Create tuition, term, or lab fee heads in the Fees board.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {heads.map((head) => (
                <li key={head.id} className="flex items-center justify-between py-2 text-xs">
                  <span className="font-medium text-slate-800">{head.name}</span>
                  <span className="font-semibold text-slate-900">
                    ₹{head.amount.toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              href="/fees"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Configure Fee Structures <ArrowRight size={12} />
            </Link>
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card className="border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <CardTitle>Recent Payment Transactions</CardTitle>
            <Link
              href="/reports/payments"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View All
            </Link>
          </div>

          {payments.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-700">No payment transactions recorded yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Use the Fee Collection Desk to record payments and issue instant receipts.
              </p>
              <Link
                href="/fees"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Record first payment <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="mt-3 w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="pb-2">Receipt</th>
                    <th className="pb-2">Student</th>
                    <th className="pb-2">Fee Head</th>
                    <th className="pb-2">Method</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.slice(0, 6).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-mono text-[11px] text-slate-600">
                        {p.receiptNumber || "—"}
                      </td>
                      <td className="py-2.5">
                        <p className="font-medium text-slate-900">{p.studentName}</p>
                        <p className="text-[10px] text-slate-400">{p.admissionNumber}</p>
                      </td>
                      <td className="py-2.5 text-slate-600">{p.feeHeadName}</td>
                      <td className="py-2.5">
                        <Badge variant="muted" className="uppercase text-[10px]">
                          {p.method}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-slate-900">
                        ₹{p.amount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
