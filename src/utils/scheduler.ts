/**
 * Yields execution back to the browser event loop so pending UI paints,
 * input events, and microtasks can run without being blocked by long JavaScript tasks.
 * Uses native scheduler.yield() when supported, with setTimeout fallback.
 */
export function yieldToMain(): Promise<void> {
  if (
    typeof window !== 'undefined' &&
    'scheduler' in window &&
    typeof (window.scheduler as { yield?: () => Promise<void> }).yield === 'function'
  ) {
    return (window.scheduler as { yield: () => Promise<void> }).yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}
