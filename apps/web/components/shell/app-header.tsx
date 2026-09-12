"use client";

import { Bell } from "lucide-react";
import { useAppBranding } from "../../lib/branding-context";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { acl } = useAppBranding();
  return (
    <header className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-white p-2 text-slate-400 shadow-sm">
          <Bell size={16} />
        </span>
        <div className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
          {acl.roles[0]?.replace(/_/g, " ")}
        </div>
      </div>
    </header>
  );
}
