import type { CSSProperties } from "react";

// Hue per category (colour only; the category list itself always comes from /meta).
const HUES: Record<string, number> = {
  crime: 0, lifestyle: 335, disaster: 22, religion: 38, weather: 55, sports: 88, environment: 130,
  health: 160, science: 185, business: 208, technology: 235, education: 262, politics: 285,
  arts_entertainment: 310,
};
export function hueOf(cat: string): number {
  if (cat in HUES) return HUES[cat];
  let h = 0;
  for (const c of cat) h = (h * 31 + c.charCodeAt(0)) % 360; // unknown future category: stable fallback
  return h;
}
export const catStyle = (cat: string): CSSProperties => ({ ["--h" as string]: hueOf(cat) });

const NICE: Record<string, string> = { arts_entertainment: "Arts & entertainment" };
export function prettyCategory(cat: string): string {
  if (NICE[cat]) return NICE[cat];
  const s = cat.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
export const pct = (p: number) => `${Math.round(p * 1000) / 10}%`;
export const fixed = (n: number | undefined, d = 3) => (typeof n === "number" ? n.toFixed(d) : "n/a");
export const isLook = (tool: string) => /^(get_|classify_|find_)/.test(tool);
export const MAX_CHARS = 30000; // backend limit (schemas.MAX_CHARS)

/** Agent stop reasons can carry raw error text; show a clean version. */
export function friendlyStop(reason: string): string {
  const r = reason.replace(/\.\s*Returning the unsaved draft summary\.?$/, "").trim();
  return /^error/i.test(r) ? "Error in the AI model" : r;
}
