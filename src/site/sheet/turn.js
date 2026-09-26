/** The sheet change, run inline in every page's head: forward or back from the sheet numbers, the paper leaf, the page-turn sound, and the hold:
 * the old sheet stays whole until the new one is drawn (its fonts, and `sheet:ready` when the page sets `data-hold`), then the page turns.
 * A press during the turn, or one that starts on it and ends after it, speeds it to its end and then reaches what is under it. */
(() => {
  const h = document.documentElement, S = document.currentScript.dataset.sound, CAP = 2500, TAIL = 300, FAST = 150;
  const n = (u) => +((new URL(u).pathname.match(/\/u\/(\d+)-/) || [])[1] || 0);
  const still = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
  const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const drawn = () => new Promise((r) => { if (!h.dataset.hold || self.__sheetReady) r(); else document.addEventListener('sheet:ready', r, { once: true }); });
  const turns = () => document.getAnimations().filter((a) => /^::view-transition/.test(a.effect && a.effect.pseudoElement || ''));
  let turn = null;

  addEventListener('pageswap', (e) => {
    const a = e.activation;
    if (e.viewTransition && a && a.entry && !still() && n(a.entry.url) > n(location.href)) h.classList.add('turning');
  });
  addEventListener('pageshow', (e) => { if (e.persisted) h.classList.remove('turning'); });

  addEventListener('pagereveal', (e) => {
    h.classList.remove('turning');
    const v = e.viewTransition, f = self.navigation && navigation.activation && navigation.activation.from;
    if (!v) return;
    const back = !!f && n(f.url) > n(location.href), move = !!f && !still();
    if (f) v.types.add(back ? 'back' : 'forward');
    if (move) {
      const d = document.createElement('div');
      d.className = 'leaf'; d.setAttribute('aria-hidden', 'true'); (document.body || h).append(d);
      if (back) h.classList.add('turning');
      v.finished.finally(() => { d.remove(); h.classList.remove('turning'); });
    }
    h.classList.add('hold');
    turn = { v, t0: 0 };
    v.finished.finally(() => { turn = null; });
    Promise.race([Promise.all([frames().then(() => document.fonts.ready), drawn()]), new Promise((r) => setTimeout(r, CAP))]).then(() => {
      h.classList.remove('hold');
      if (turn) turn.t0 = performance.now();
      if (move) new Audio(S + (back ? '-back' : '') + (new Audio().canPlayType('audio/ogg; codecs=opus') ? '.opus' : '.m4a')).play().catch(() => {});
    });
  });

  const tail = (t) => !t.t0 || performance.now() - t.t0 < TAIL;
  let down = null;
  addEventListener('pointerdown', (e) => { down = turn && e.target === h ? { t: turn, tail: tail(turn) } : null; }, true);
  addEventListener('click', (e) => {
    const d = down;
    down = null;
    if (e.target !== h) return;
    const t = turn || (d && d.t), x = e.clientX, y = e.clientY;
    if (!t || (turn ? tail(t) : d.tail)) return;
    for (const a of turns()) { const left = a.effect.getComputedTiming().endTime - a.currentTime; if (left > FAST) a.playbackRate = left / FAST; }
    t.v.finished.then(() => { const el = document.elementFromPoint(x, y), to = el && el.closest('a[href],button,summary,[role=button]'); if (to) to.click(); });
  }, true);
})();
