/** After a deploy, cached HTML can point at deleted chunks: reload once (at most every 10 s) to fetch the new page. */
const KEY = 'plates:v1:reloadedAt';

window.addEventListener('vite:preloadError', (e) => {
  try {
    if (Date.now() - Number(sessionStorage.getItem(KEY) ?? 0) < 10_000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return;
  }
  e.preventDefault();
  location.reload();
});
