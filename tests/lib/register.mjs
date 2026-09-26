// Lets node's test runner import the unit's TypeScript: extensionless paths get '.ts', and 'explainer-kit' is the vendored kit.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
const KIT = pathToFileURL(new URL('../../src/kit/explainer/src/index.ts', import.meta.url).pathname).href;
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  if (spec === 'explainer-kit') return next(${JSON.stringify(KIT)}, ctx);
  try { return await next(spec, ctx); } catch (e) {
    if (spec.startsWith('.') && !/\\.[cm]?[jt]s$/.test(spec)) return next(spec + '.ts', ctx);
    throw e;
  }
}`));
globalThis.requestAnimationFrame ??= () => 0;
