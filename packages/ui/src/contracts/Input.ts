export const INPUT_STATES = ["empty", "filled", "error"] as const;
export type InputState = (typeof INPUT_STATES)[number];
