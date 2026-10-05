# `dateStr` is canonical; `Solve` is clone-safe

`Solve` stores its date only as the `dateStr` string (`YYYY-MM-DD`) and no longer holds a
`Temporal.PlainDate`. Temporal is still used throughout the logic — `Temporal.PlainDate.from(dateStr)`
is derived on demand — but a `Solve` carries only primitives, so a session can cross a `postMessage`
or IndexedDB boundary without a `DataCloneError`.

This is a deliberate exception to the Temporal-first rule (which bans JS `Date`), not a regression.
`Temporal.PlainDate` is not structured-cloneable, and the whole dataset must be serialisable for
IndexedDB and for the Dataset Worker. The stored `date` was redundant derived state: it was always
`Temporal.PlainDate.from(dateStr)`, produced together with `dateStr` in the parser, and already
serialised to a string when persisted.

## Consequences

- Time-based grouping (Period Group) keys off `dateStr` — the local-timezone date the parser
  already computed — instead of rebuilding a `ZonedDateTime` per solve; this also removes the
  duplicated timezone conversion.
- `PeriodGroup.startDate` / `endDate` are strings, not `Temporal.PlainDate`.
- Do not re-add a `Temporal.PlainDate` field to `Solve`: it would break the Worker and IndexedDB
  seams.
