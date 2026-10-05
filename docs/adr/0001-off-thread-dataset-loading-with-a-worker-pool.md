# Off-thread dataset loading with a Worker pool

Parsing a csTimer export and computing per-solve averages blocks the main thread — measured at
~0.5–1.0 s for a 50 000-solve session, crossing the 50 ms long-task budget at ~5 000 solves. We
move that computation off the main thread into a dedicated, page-bound Web Worker behind a
reusable task dispatcher (the **Worker Pool**), while persistence stays on the page in the
**Dataset Store**.

We chose a dedicated Worker over the Service Worker that already powers the PWA because a Service
Worker is origin-scoped, event-driven, and may be terminated by the browser between events, so it
cannot be relied on for CPU work; a dedicated Worker keeps its state and event loop for the page's
lifetime. We chose it over the main thread (even with `scheduler.yield()` chunking) because the cost
sits in one hot per-solve average-of-N path that is not cleanly chunkable.

The seam is a port with two adapters: the real Worker Pool in the browser, and an in-page
synchronous adapter used when `Worker` is unavailable — which Vitest's jsdom environment requires,
since it has no `Worker`. Progress stays stage-based (`reading → parsing → persisting → ready`); the
worker protocol is request/response only.

## Considered options

- **Service Worker** — rejected: evictable between events, no compute guarantee.
- **Main thread with cooperative yielding** — rejected: the AoN loop is one hot path, and it still
  competes with rendering.
- **Worker spawned per load** — rejected: pays spawn cost with no reuse; a persistent pool
  amortises it.
