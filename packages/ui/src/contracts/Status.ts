export const STATUS_CHIPS = ["present", "absent", "late", "holiday", "feeDue", "published"] as const;
export type StatusChip = (typeof STATUS_CHIPS)[number];

/**
 * Which brand/text role each status chip uses.
 * Hex values are resolved in `createTheme` from tenant branding (or fallbacks).
 */
export const STATUS_CHIP_SEMANTIC = {
  present: "success",
  absent: "danger",
  late: "warning",
  holiday: "inkMuted",
  feeDue: "warning",
  published: "primary",
} as const satisfies Record<StatusChip, "success" | "danger" | "warning" | "primary" | "inkMuted">;

export type StatusChipSemantic = (typeof STATUS_CHIP_SEMANTIC)[StatusChip];
