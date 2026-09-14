"use client";

import { DASHBOARD_ROLE_LABELS, type DashboardRole } from "./dashboard-policy";
import { cn } from "../../lib/utils";

interface RoleSwitcherProps {
  availableRoles: DashboardRole[];
  activeRole: DashboardRole;
  onSelectRole: (role: DashboardRole) => void;
}

export function RoleSwitcher({ availableRoles, activeRole, onSelectRole }: RoleSwitcherProps) {
  if (availableRoles.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-100 p-1">
      <span className="px-2 text-xs font-medium text-slate-500">View as:</span>
      {availableRoles.map((role) => {
        const isActive = activeRole === role;
        const labels = DASHBOARD_ROLE_LABELS[role];
        return (
          <button
            key={role}
            type="button"
            onClick={() => onSelectRole(role)}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-semibold transition-all",
              isActive
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:bg-white/60 hover:text-slate-900",
            )}
          >
            {labels.en}
          </button>
        );
      })}
    </div>
  );
}
