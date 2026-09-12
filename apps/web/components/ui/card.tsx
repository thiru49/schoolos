import { cn } from "../../lib/utils";

export function Card({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("rounded-2xl border border-slate-100 bg-white p-5 shadow-sm", className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <h3 className={cn("font-display text-sm font-semibold text-slate-500", className)}>{children}</h3>;
}
