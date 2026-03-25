export const LABEL_TYPES = ["battalion", "location"] as const;

export type LabelType = (typeof LABEL_TYPES)[number];

