"use client";

import type React from "react";
import { Toaster } from "sonner";

export function AppToaster() {
  const ToastHost = Toaster as unknown as (props: { position: string }) => React.JSX.Element;
  return <ToastHost position="top-right" />;
}
