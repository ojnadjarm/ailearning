/** Progress source (read-only): the ?state=returning fixture, plates:v1:progress from storage, or nothing. Always { units, resume }. */
// TODO(progress store): replace this reader with the learner store (Repository + memory fallback, migrate, write at beat boundaries).
const FIXTURE = { units: { U01: { state: 'played', beat: 'challenge' } }, resume: { unit: 'U01', beat: 'challenge' } };

export function readProgress(state) {
  if (new URLSearchParams(location.search).has('state')) return state === 'returning' ? FIXTURE : { units: {} };
  try {
    const p = JSON.parse(localStorage.getItem('plates:v1:progress') || '{}') || {};
    return { units: p.units && typeof p.units === 'object' ? p.units : {}, resume: p.resume };
  } catch {
    return { units: {} };
  }
}
