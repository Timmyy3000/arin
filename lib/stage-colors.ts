export const STAGE_COLORS = [
  "slate",
  "blue",
  "indigo",
  "violet",
  "pink",
  "rose",
  "amber",
  "lime",
  "emerald",
  "teal",
] as const;

export type StageColor = (typeof STAGE_COLORS)[number];

export type StageColorTokens = { bg: string; text: string };

export const STAGE_COLOR_TOKENS: Record<StageColor, StageColorTokens> = {
  slate:   { bg: "oklch(0.19 0.01 250 / 0.6)", text: "oklch(0.55 0.04 250)" },
  blue:    { bg: "oklch(0.20 0.04 220 / 0.6)", text: "oklch(0.65 0.08 220)" },
  indigo:  { bg: "oklch(0.21 0.06 270 / 0.6)", text: "oklch(0.68 0.13 270)" },
  violet:  { bg: "oklch(0.22 0.06 295 / 0.6)", text: "oklch(0.70 0.13 295)" },
  pink:    { bg: "oklch(0.22 0.07 340 / 0.6)", text: "oklch(0.72 0.14 340)" },
  rose:    { bg: "oklch(0.22 0.07 15 / 0.6)",  text: "oklch(0.70 0.14 15)" },
  amber:   { bg: "oklch(0.22 0.07 65 / 0.6)",  text: "oklch(0.72 0.14 65)" },
  lime:    { bg: "oklch(0.21 0.07 125 / 0.6)", text: "oklch(0.70 0.14 125)" },
  emerald: { bg: "oklch(0.20 0.06 155 / 0.6)", text: "oklch(0.65 0.14 155)" },
  teal:    { bg: "oklch(0.20 0.05 195 / 0.6)", text: "oklch(0.65 0.10 195)" },
};

export function isStageColor(value: unknown): value is StageColor {
  return typeof value === "string" && (STAGE_COLORS as readonly string[]).includes(value);
}
