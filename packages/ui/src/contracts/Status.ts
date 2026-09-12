export const STATUS_CHIPS = ["present", "absent", "late", "holiday", "feeDue", "published"] as const;
export type StatusChip = (typeof STATUS_CHIPS)[number];
