/** A press on a link to another sheet, run inline in every page's head: the pressed face at once and one navigation per press (later presses
 * wait for it); a link to the sheet already open does not reload it. */
(() => {
  let on = null, timer = 0;
  const release = () => { if (on) on.classList.remove('pressed'); on = null; clearTimeout(timer); };
  addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.hasAttribute('download')
      || (a.target && a.target !== '_self') || a.origin !== location.origin) return;
    if (on) { e.preventDefault(); return; }
    if (a.pathname === location.pathname && a.search === location.search) { if (!a.hash) { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); } return; }
    on = a; a.classList.add('pressed');
    timer = setTimeout(release, 10000);
  });
  addEventListener('pageshow', (e) => { if (e.persisted) release(); });
  if (self.navigation) navigation.addEventListener('navigateerror', release);
})();
