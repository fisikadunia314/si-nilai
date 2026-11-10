/** Kalkulasi nilai akhir: Σ(nilai × bobot) / Σ(bobot komponen yang terisi). */
export type ScoreLike = { value: number | null };
export type ComponentLike = { weight: number };

export function computeFinal(scores: ScoreLike[], components: ComponentLike[]): number | null {
  let sum = 0, weight = 0;
  for (let i = 0; i < components.length; i++) {
    const v = scores[i]?.value;
    if (v === null || v === undefined) continue;
    sum += v * components[i].weight;
    weight += components[i].weight;
  }
  if (weight === 0) return null;
  return Math.round((sum / weight) * 100) / 100;
}

export function formatScore(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
