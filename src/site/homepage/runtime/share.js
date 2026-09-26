/** Send to my desktop: the share sheet, or the link copied; the label never shows the address. */
export function share() {
  const b = document.querySelector('[data-share]'), url = location.href.split(/[?#]/)[0];
  b.addEventListener('click', async () => {
    try { if (navigator.share) return await navigator.share({ title: document.title, url }); }
    catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); b.textContent = 'Link copied'; }
    catch { b.textContent = 'Copy link'; }
  });
}
