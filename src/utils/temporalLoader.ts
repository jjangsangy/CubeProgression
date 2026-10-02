/**
 * Conditionally loads the Temporal polyfill ONLY on browsers/environments
 * that lack standard ECMAScript Temporal support. Modern browsers bypass
 * this entirely (0 bytes transferred, 0 ms execution).
 */
export async function ensureTemporal(): Promise<void> {
  if (typeof globalThis.Temporal === 'undefined') {
    const { Temporal } = await import('temporal-polyfill');
    (globalThis as unknown as { Temporal: typeof Temporal }).Temporal = Temporal;
  }
}
