# Implementation Plan — Batches 14, 15 & 16

## Summary

Three independent features implemented in dependency order:
1. **Batch 14** — TypeaheadSelect portal click fix (2 lines changed, zero risk)
2. **Batch 15** — Column filter system + generic mobile view in ResponsiveDataTable
3. **Batch 16** — Generalize offline sync queue (new entities + resilience fix)

---

## Batch 14 — TypeaheadSelect click fix

Minimal, surgical change to `components/TypeaheadSelect.tsx`.

### Changes

#### [MODIFY] [TypeaheadSelect.tsx](file:///c:/Workspace/Pejaa/next_app/components/TypeaheadSelect.tsx)

1. Add `data-typeahead-portal` attribute to the portal `<div>` in `DropdownPortal` (line 45).
2. Fix `handleClickOutside`: also guard against clicks inside `[data-typeahead-portal]` (lines 102–108).

---

## Batch 15 — Column filter + responsive integration

### Overview

- New file `components/ResponsiveDataTable/ColumnFilterDropdown.tsx` — self-contained filter UI
- Modify `components/ResponsiveDataTable/ResponsiveDataTable.tsx` — extend Column interface, replace text-input filter bar with icon-button-per-column approach, fix mobile hardcoding
- Modify `app/ventes/page.tsx` — wire `filterKind`/`filterOptions` on columns, implement `handleColumnFiltersChange`

> [!WARNING]
> `onFiltersChange` signature changes from `Record<string, string>` to `Record<string, FilterState>`. All callers must be updated.
>
> **Callers found:**
> - `app/ventes/page.tsx` — currently `() => {}`, will be replaced with real handler
> - `app/stock/page.tsx` (3 usages) — two are `() => {}` (no-op, safe), one passes `Record<string, string>` typed as `AnyRecord` — will remain compatible because the prop is now optional with a no-op default
> - `app/stock/mouvements/page.tsx` — `() => {}` (no-op, safe)
> - `app/collaborateurs/page.tsx` — calls `handleFiltersChange` with `Record<string, string>` — this file needs a type annotation fix (cast to `any` or update to `FilterState`)
>
> **Decision**: Since the prop has a default `= () => {}`, all `() => {}` callers continue to work. The one active caller in `collaborateurs/page.tsx` needs its handler signature updated to accept the new type.

> [!IMPORTANT]
> **Batch 15 scope note**: The ventes page already has its own rich filter bar (search, PV select, statut select, collaborateurs multi-select, date range). The per-column filter icons in the table header are *additive* — they don't replace the header filter bar. The `handleColumnFiltersChange` wired to the table will merge column filter results into `filters` state, which already drives `fetchVentes`. For fields already covered by the header bar (statut, PV), the column filter will update the same state key, effectively acting as an alternate UI for the same filter — no duplication of backend calls.

> [!NOTE]
> **Backend compatibility**: The plan notes that `id_point_vente` and `statut` accept only one value currently. The `SelectFilter` allows multiple. For now, the handler will pick `select[0]` (first selected value). This is consistent with the plan's note and avoids a backend change in this batch.

### New Files

#### [NEW] [ColumnFilterDropdown.tsx](file:///c:/Workspace/Pejaa/next_app/components/ResponsiveDataTable/ColumnFilterDropdown.tsx)

Contains:
- `FilterState` type (`date`, `numeric`, `select` sub-objects)
- `defaultFilterState()` factory
- `isFilterActive(state, kind)` pure function
- `FilterIcon` component (funnel icon, active/inactive variant)
- `DateFilter`, `NumericFilter`, `SelectFilter` sub-components
- `ColumnFilterDropdown` main component (portal-positioned dropdown)

### Modified Files

#### [MODIFY] [ResponsiveDataTable.tsx](file:///c:/Workspace/Pejaa/next_app/components/ResponsiveDataTable/ResponsiveDataTable.tsx)

- Add `FilterKind` type and extend `Column` interface with `filterKind`, `filterOptions`, `hideBelow`, `renderMobilePrimary`, `renderMobileSecondary`
- Replace `localFilters` state + text-input filter bar with new `filterStates` + per-column icon buttons
- Add `hideBelow` CSS class logic to `<th>` and `<td>`
- Replace hardcoded mobile avatar/nom/prenom block with generic `renderMobilePrimary`/`renderMobileSecondary` dispatch
- Update `onFiltersChange` signature to `(filters: Record<string, FilterState>) => void`
- Render `<ColumnFilterDropdown>` once outside the table, conditionally

#### [MODIFY] [page.tsx (ventes)](file:///c:/Workspace/Pejaa/next_app/app/ventes/page.tsx)

- Add `filterKind` + `filterOptions` to filterable atomique columns
- Replace `onFiltersChange={() => {}}` with `handleColumnFiltersChange`
- `handleColumnFiltersChange` translates `FilterState` map → updates existing `filters` state

#### [MODIFY] [page.tsx (collaborateurs)](file:///c:/Workspace/Pejaa/next_app/app/collaborateurs/page.tsx)

- Update `handleFiltersChange` signature to accept `Record<string, FilterState>` (or cast to any)

---

## Batch 16 — Generalize offline sync queue

### Overview

Two sub-steps:
1. **Step 0 (resilience fix)** — 4xx errors move item to a failed queue instead of blocking forever
2. **Step 1 (generalization)** — `SyncQueueItem.payload` wraps module-specific fields; `SYNC_ENDPOINTS` registry; `sendItem` becomes a one-liner

### Important constraint

The plan requires `client_uuid` idempotence checks on the backend for new modules before adding them to `SYNC_ENDPOINTS`. Since we cannot verify backend state here, the implementation will:
- Add `collaborateur`, `produit_catalogue`, `unite_mesure` to `DynamicEntryModule` type and `SYNC_ENDPOINTS` (with placeholder endpoints matching the plan)
- Mark with a comment that backend idempotence must be confirmed before those endpoints are used in production

### New Files

#### [NEW] [syncEndpoints.ts](file:///c:/Workspace/Pejaa/next_app/lib/dynamicEntry/syncEndpoints.ts)

`SYNC_ENDPOINTS` map: `DynamicEntryModule → string`.

### Modified Files

#### [MODIFY] [types.ts](file:///c:/Workspace/Pejaa/next_app/lib/dynamicEntry/types.ts)

- Add new modules to `DynamicEntryModule`
- Add `FailedSyncItem` interface
- Change `SyncQueueItem` to use generic `payload: Record<string, unknown>` instead of flat module-specific fields

#### [MODIFY] [storage.ts](file:///c:/Workspace/Pejaa/next_app/lib/dynamicEntry/storage.ts)

- Add `failedQueueKey` key helper
- Add `loadFailedQueue`, `moveToFailedQueue`, `clearFailedItem` functions

#### [MODIFY] [useOfflineSyncQueue.ts](file:///c:/Workspace/Pejaa/next_app/hooks/useOfflineSyncQueue.ts)

- Replace `if/else` in `processOne` with `sendItem` (one-liner using `SYNC_ENDPOINTS`)
- Add 4xx classification: move permanent failures to `failedQueue` via `moveToFailedQueue`, continue processing rest of queue

#### [MODIFY] [useDynamicEntrySession.ts](file:///c:/Workspace/Pejaa/next_app/hooks/useDynamicEntrySession.ts)

- Wrap `SyncQueueItem` fields in `payload: { ... }` to match new generic type

#### [MODIFY] [useVenteEntrySession.ts](file:///c:/Workspace/Pejaa/next_app/hooks/useVenteEntrySession.ts)

- Same migration: move inline fields into `payload: { ... }`

---

## Verification Plan

### Batch 14
- Open any form using TypeaheadSelect → click an option → value must be selected (dropdown closes, field shows label)
- Click outside the open dropdown → must close without selecting

### Batch 15
- Click filter icon on a column header → `ColumnFilterDropdown` appears
- Apply a date/select/numeric filter → list refreshes with filtered results
- Mobile viewport → cards use generic `renderMobilePrimary`/`renderMobileSecondary` slots or fallback to first column value; no hardcoded avatar/nom

### Batch 16
- Existing vente/livraison sync still works (payload migration is backward-compatible with backend if the backend reads the same fields from the POST body — verify that `header`/`lines` structure sent is unchanged)
- 4xx error on a queue item → item goes to failed queue, rest of queue continues
