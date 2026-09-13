import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

type DialogProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && onOpenChange) {
          onOpenChange(false);
        }
      }}
    >
      {children}
    </div>
  );
}

export function DialogContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-xl",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DialogHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between border-b border-slate-100 pb-4 text-left", className)}>
      {children}
    </div>
  );
}

export function DialogFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mt-6 flex justify-end gap-2 pt-2", className)}>
      {children}
    </div>
  );
}

export function DialogTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className={cn("font-display text-lg font-bold text-slate-900", className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("text-xs text-slate-500", className)}>
      {children}
    </p>
  );
}

export function DialogClose({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors",
        className
      )}
      aria-label="Close"
    >
      <X size={18} />
    </button>
  );
}
