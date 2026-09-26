/** Seeded uniform numbers in [0, 1) (mulberry32): the same seed always poses the same cases. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** A seeded picker: one element of a list, or an integer in [a, b]. */
export function picker(seed: number): { one<T>(l: readonly T[]): T; int(a: number, b: number): number; r: () => number } {
  const r = rng(seed);
  return { r, one: (l) => l[Math.floor(r() * l.length)], int: (a, b) => a + Math.floor(r() * (b - a + 1)) };
}
