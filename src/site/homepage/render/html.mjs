/** Escapes text for HTML content and attributes. */
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Greedy word wrap to lines of at most `max` characters. */
export function wrap(s, max) {
  const out = [''];
  for (const w of s.split(' ')) (out[out.length - 1] + ' ' + w).trim().length > max ? out.push(w) : (out[out.length - 1] = (out[out.length - 1] + ' ' + w).trim());
  return out;
}
