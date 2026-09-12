import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      present: "bg-emerald-50 text-success",
      absent: "bg-red-50 text-danger",
      late: "bg-amber-50 text-warning",
      holiday: "bg-slate-100 text-slate-600",
      published: "bg-sky-50 text-primary",
      muted: "bg-slate-100 text-slate-600",
    },
  },
  defaultVariants: { variant: "muted" },
});

export function Badge({
  className,
  variant,
  children,
}: VariantProps<typeof badgeVariants> & { className?: string; children?: React.ReactNode }) {
  return <span className={cn(badgeVariants({ variant }), className)}>{children}</span>;
}

export function statusBadge(status: string | null) {
  if (status === "P") return <Badge variant="present">Present</Badge>;
  if (status === "A") return <Badge variant="absent">Absent</Badge>;
  if (status === "L") return <Badge variant="late">Late</Badge>;
  if (status === "H") return <Badge variant="holiday">Holiday</Badge>;
  return <Badge>—</Badge>;
}
