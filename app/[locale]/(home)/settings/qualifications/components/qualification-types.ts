export const QUALIFICATION_TYPES = ["education", "skill"] as const;

export type QualificationType = (typeof QUALIFICATION_TYPES)[number];

