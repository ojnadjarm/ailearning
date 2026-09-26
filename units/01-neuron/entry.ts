import '../../src/core/reload';

/** Page entry: from 1024 px wide the plate loads here (the module blocks the first render, so a sheet change never shows it empty); narrower, the page is the narrow sheet until the window widens. */
const wide = matchMedia('(min-width: 1024px)');
const plate = (): Promise<unknown> => { document.documentElement.classList.remove('is-narrow'); return import('./main'); };
if (wide.matches) await plate();
else { document.documentElement.classList.add('is-narrow'); wide.addEventListener('change', () => { void plate(); }, { once: true }); }
