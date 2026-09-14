"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  getFocusableElements,
  getFocusTrapTarget,
  getInitialFocusTarget,
  shouldCloseOnEscape,
} from "./dialog-a11y";

type DialogProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

type DialogContextValue = {
  titleId: string;
  descriptionId: string;
  setHasTitle: (value: boolean) => void;
  setHasDescription: (value: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext(component: string): DialogContextValue {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error(`${component} must be used within Dialog`);
  }
  return context;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const [hasTitle, setHasTitle] = React.useState(false);
  const [hasDescription, setHasDescription] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!open) {
      setHasTitle(false);
      setHasDescription(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    const initialFocusTarget = getInitialFocusTarget(dialogElement);
    if (initialFocusTarget) {
      initialFocusTarget.focus();
    } else {
      dialogElement.tabIndex = -1;
      dialogElement.focus();
    }

    return () => {
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  React.useEffect(() => {
    if (!open || !onOpenChange) return;

    const handleOpenChange = onOpenChange;

    function handleKeyDown(event: KeyboardEvent) {
      if (shouldCloseOnEscape(event.key, true, event.defaultPrevented)) {
        event.preventDefault();
        handleOpenChange(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;

    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    const focusables = getFocusableElements(dialogElement);
    const target = getFocusTrapTarget(focusables, document.activeElement, event.shiftKey);

    if (target) {
      event.preventDefault();
      target.focus();
      return;
    }

    if (focusables.length === 0) {
      event.preventDefault();
    }
  }

  if (!open) return null;

  return (
    <DialogContext.Provider
      value={{
        titleId,
        descriptionId,
        setHasTitle,
        setHasDescription,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hasTitle ? titleId : undefined}
        aria-describedby={hasDescription ? descriptionId : undefined}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
        onKeyDown={handleDialogKeyDown}
        onClick={(event) => {
          if (event.target === event.currentTarget && onOpenChange) {
            onOpenChange(false);
          }
        }}
      >
        {children}
      </div>
    </DialogContext.Provider>
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
      onClick={(event) => event.stopPropagation()}
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
  const { titleId, setHasTitle } = useDialogContext("DialogTitle");

  React.useLayoutEffect(() => {
    setHasTitle(true);
    return () => setHasTitle(false);
  }, [setHasTitle]);

  return (
    <h2 id={titleId} className={cn("font-display text-lg font-bold text-slate-900", className)}>
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
  const { descriptionId, setHasDescription } = useDialogContext("DialogDescription");

  React.useLayoutEffect(() => {
    setHasDescription(true);
    return () => setHasDescription(false);
  }, [setHasDescription]);

  return (
    <p id={descriptionId} className={cn("text-xs text-slate-500", className)}>
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
