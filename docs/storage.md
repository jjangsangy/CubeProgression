# Persistence & Storage

Implemented in [`src/utils/dbStorage.ts`](../src/utils/dbStorage.ts). The app persists the
active dataset and view settings to **IndexedDB** so analysis survives reloads. There is no
server-side storage.

## Database schema

| Setting | Value |
| --- | --- |
| Database name | `CubeProgressionDB` |
| Version | `1` |
| Object store | `datasets` |
| Key path | `id` |
| Record key written | `active_dataset` (constant `ACTIVE_KEY`) |

Only a single record (`active_dataset`) is ever stored — the app keeps one active dataset,
not a history.

### `StoredDataset`

```ts
interface StoredDataset {
  id: string;                    // always 'active_dataset'
  fileName: string;
  sessions: Session[];
  selectedSessionId: string;
  groupingPeriod?: GroupingPeriod;
  customBatchSize?: number;
  updatedAt: number;             // Temporal.Now.instant().epochMilliseconds
}
```

## API

| Function | Behavior |
| --- | --- |
| `saveDataset({ fileName, sessions, selectedSessionId, groupingPeriod?, customBatchSize? })` | Opens the DB, `put`s the record. Errors are caught and logged (never throws). |
| `getSavedDataset(): Promise<StoredDataset | null>` | Reads `active_dataset`, normalizes each solve's `dateStr`, returns `null` if absent/error. |
| `clearSavedDataset(): Promise<void>` | Deletes the `active_dataset` key. Errors caught/logged. |
| `getStorageInfo(): Promise<StorageEstimateInfo | null>` | Wraps `navigator.storage.estimate()`, returns `{ usageMB, quotaMB? }` in MB (usage to 2 dp, quota to 0 dp). |

### Private helper: `openDB()`

- Returns `null` when `window`/`window.indexedDB` is unavailable (e.g. SSR or jsdom), so
  **every public function degrades to a no-op / `null`** rather than crashing.
- Creates the `datasets` store with `keyPath: 'id'` on `onupgradeneeded`.

### Private helper: `normalizeSessionsDates(sessions)`

Solves carry only primitives (`dateStr` is the canonical `YYYY-MM-DD` string), so the whole
dataset is structured-cloneable and `saveDataset` stores sessions as-is. On retrieval,
`normalizeSessionsDates` guarantees every solve has a valid `dateStr`, deriving one from the
solve `timestamp` (in the local timezone) when it is missing or malformed. No `Temporal.PlainDate`
is stored on `Solve`; it is derived on demand (see ADR-0002). Native JS `Date` is strictly forbidden.

## How `App.tsx` uses storage

1. **On mount** (`initializeDataset`): `getSavedDataset()`. If it returns sessions, restore
   them (and `selectedSessionId`, `groupingPeriod`, `customBatchSize`), set `isSaved`, and
   fetch `getStorageInfo()` for the usage pill. Otherwise generate the demo dataset, then
   `saveDataset(...)`.
2. **On upload / demo load**: after parsing, immediately `saveDataset(...)`.
3. **On setting change** (`handleSelectSession`, `handleChangeGrouping`,
   `handleChangeCustomBatchSize`): fire-and-forget `saveDataset(...)` with the existing
   sessions and the new setting. All calls use `.catch(console.error)`.
4. **On clear** (`handleClearStorage`): resets React state to empty *and* calls
   `clearSavedDataset()`. The dashboard reverts to the empty shell (the user can reload the
   demo via `FileUploader`).

## Storage estimate

`getStorageInfo` powers the "N MB" indicator in `FileUploader`. It is
optional and returns `null` when `navigator.storage.estimate` is unavailable.

## Testing notes

`jsdom` does not provide a functional IndexedDB, so `openDB()` resolves `null` in tests and
persistence is effectively disabled. `App.test.tsx` relies on this: the app always falls
back to the generated demo dataset. Do **not** assume IndexedDB writes persist in unit tests.

## Gotchas

- Writes are best-effort; a failed save never blocks the UI.
- The full `sessions` payload (including scrambles) is serialized on every settings change,
  so very large datasets re-write the whole record each time.
- Restoring depends on `normalizeSessionsDates`; any code that adds new `Solve` fields must
  also preserve them through structured cloning.
