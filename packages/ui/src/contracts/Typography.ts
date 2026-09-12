export const TEXT_VARIANTS = ["display", "title", "body", "caption", "label"] as const;
export type TextVariant = (typeof TEXT_VARIANTS)[number];
