"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  const ToastHost = Toaster as unknown as (props: { position: string }) => JSX.Element;
  return <ToastHost position="top-right" />;
}
