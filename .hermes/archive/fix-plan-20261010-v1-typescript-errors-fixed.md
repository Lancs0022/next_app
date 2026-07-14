# TypeScript Error Fix Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.
>
> **Goal:** Fix all TypeScript compilation errors in the Pejaa Next.js application to achieve clean `tsc --noEmit` output.
>
> **Architecture:** Address root causes in order: module resolution → missing imports → type mismatches → property name corrections.
>
> **Tech Stack:** Next.js 15+, TypeScript 5.x, React 18, Prisma ORM
>
> ---

## Task 1: Fix Module Resolution in API Routes ✅ COMPLETED

**Date:** 2026-07-12
**Status:** ✅ DONE

**Solution Applied:**
- Fixed `app/api/stock/lots/[id]/mouvements/route.ts` to use `@/lib/auth` and `@/lib/db` path aliases
- Fixed `lib/auth.ts` to use `import * as jwt` for named imports (jsonwebtoken doesn't have default export)

**Verification:** `npx tsc --noEmit` passes without module resolution errors

**Notes:** The `@/` path aliases work correctly. The issue was the `--skipLibCheck` flag was needed when running tsc without project context.

---

## Task 2: Add Missing Imports in LotDetailModal ✅ COMPLETED

**Date:** 2026-07-12
**Status:** ✅ DONE

**Solution Applied:**
- Added `import { useToast } from '@/components/Toast/ToastContainer'` to LotDetailModal.tsx
- Added `import { X } from "lucide-react"` for the close button icon

**Issues Found:**
- `showToast` was called inside a nested async function, causing "Cannot find name" error
- Removed `showToast` from useEffect dependency array after fixing the call pattern

**Verification:** `npx tsc --noEmit` passes without TS2304 errors

---

## Task 3: Fix Property Name Mismatches in LotDetailModal ✅ COMPLETED

**Date:** 2026-07-12
**Status:** ✅ DONE

**Root Cause:** Components used snake_case properties (from Prisma) while `LotActif` interface defined camelCase. The code was accessing properties that didn't exist.

**Solution Applied:**
- Added snake_case aliases to `LotActif` interface in `types.ts`:
  - `livraison_id`, `livraison_item_id`, `date_arrivee`, `pdv_id`
  - `created_at`, `created_by`, `prix_initial`, `quantite_actuelle`
  - `quantite_initiale`, `quantite_vendue`, `ventes_fermees`, `chiffre_affaires`
- Updated `mapToLotActif()` function to populate these aliases
- Added `createur_nom` and `createur_par` to `ProduitCatalogue` interface

**Verification:** `npx tsc --noEmit` passes without TS2551/TS2339 errors

---

## Task 4: Fix ActionMenu Type Mismatch in LotDetailModal ✅ COMPLETED

**Date:** 2026-07-12
**Status:** ✅ DONE

**Root Cause:** `ActionMenuId` type is `"vendre" | "ajuster" | "transfert" | "prix" | null` but code passed `string`.

**Solution Applied:**
- Changed `handleAction` parameter from `string` to `ActionMenuId`
- Changed `onAction` prop from `(actionId: string, lot: any)` to `(actionId: ActionMenuId, lot: LotActif)`

**Verification:** `npx tsc --noEmit` passes without TS2322 errors

---

## Task 5: Verify Global TypeScript Configuration ✅ COMPLETED

**Date:** 2026-07-12
**Status:** ✅ DONE

**Findings:**
- `skipLibCheck: true` in tsconfig.json correctly ignores node_modules type errors
- `tsc --noEmit` without `--skipLibCheck` flag shows spurious node_modules errors
- Using `npx tsc --noEmit` (using project tsconfig.json) is correct approach

**Final Verification:** `npx tsc --noEmit` → **0 errors**

---

## Key Insight

**Root Cause Discovery:** The cascade of node_modules errors was NOT due to missing skipLibCheck (it was already true in tsconfig.json line 10). The real issue was **compilation errors in lib/auth.ts**:
1. `import jwt from 'jsonwebtoken'` → jsonwebtoken has no default export (TS1192)
2. Broken import resolution due to excessive `../../..` chains when the file was moved

When lib/auth.ts failed to compile, TypeScript tried to validate dependencies by examining node_modules declaration files, generating misleading errors about pg, webpack, react, etc. Once lib/auth.ts compiled cleanly, all downstream errors vanished.

## Summary

| Metric | Before | After |
|--------|--------|-------|
| TypeScript Errors | ~50+ | **0** |
| Files Modified | - | 4 |
| Modules Fixed | - | 2 |
| Types Extended | - | 2 |
| Compilation Status | BROKEN | **PASSING** |

## Files Changed

1. `app/api/stock/lots/[id]/mouvements/route.ts` - Import path fix
2. `lib/auth.ts` - Named import fix (`import * as jwt`)
3. `components/Stock/LotDetailModal.tsx` - Type fixes, imports, handleAction signature
4. `components/Stock/types.ts` - Added snake_case aliases to `LotActif` and `ProduitCatalogue`

## Next Steps

1. Test the application to verify no runtime regressions
2. Proceed with BATCH 5 implementation (Sale Cancellation)
3. Archive this plan when user confirms everything is working

**Step 1: Write failing test (conceptual)**
- Run `tsc --noEmit` should fail with module not found errors for `@/lib/auth` and `@/lib/db`

**Step 2: Run test to verify failure**
```
tsc --noEmit app/api/stock/lots/[id]/mouvements/route.ts
```
Expected: FAIL with TS2307 errors

**Step 3: Write minimal implementation**
```diff
- import { withAuth } from '../../../../lib/auth'
- import { prisma } from '../../../../lib/db'
+ import { withAuth } from '@/lib/auth'
+ import { prisma } from '@/lib/db'
```

**Step 4: Run test to verify pass**
```
tsc --noEmit app/api/stock/lots/[id]/mouvements/route.ts
```
Expected: PASS (no module not found errors)

**Step 5: Commit**
```bash
git add app/api/stock/lots/[id]/mouvements/route.ts
git commit -m "fix: correct module imports in stock mouvements route"
```

## Task 2: Add Missing Imports in LotDetailModal

**Objective:** Resolve "Cannot find name" errors for `showToast` and `X` icon.

**Files:**
- Modify: `components/Stock/LotDetailModal.tsx:1-15, 69-71, 119`

**Step 1: Write failing test (conceptual)**
- tsc should fail with TS2304: Cannot find name 'showToast' and 'X'

**Step 2: Run test to verify failure**
```
tsc --noEmit components/Stock/LotDetailModal.tsx
```
Expected: FAIL with TS2304 errors

**Step 3: Write minimal implementation**
```diff
-import { useAuth } from '@/contexts/AuthContext'
+import { useAuth } from '@/contexts/AuthContext'
+import { useToast } from '@/components/Toast/ToastContainer'
+
+import { ShoppingCart, Sliders, ArrowLeftRight, DollarSign, Settings, ChevronDown, X } from "lucide-react";
```

**Step 4: Run test to verify pass**
```
tsc --noEmit components/Stock/LotDetailModal.tsx
```
Expected: PASS (no "Cannot find name" errors)

**Step 5: Update usage**
```diff
-       showToast(err?.response?.data?.error || err?.message || 'Erreur lors du chargement des mouvements de stock', 'error')
+       const { showToast } = useToast();
+       // ... later in useEffect
+       showToast(err?.response?.data?.error || err?.message || 'Erreur lors du chargement des mouvements de stock', 'error')
```

```diff
-              <X size={16} className="min-w-[16px] min-h-[16px]" />
+              <X size={16} className="min-w-[16px] min-h-[16px]" />
```

**Step 5: Commit**
```bash
git add components/Stock/LotDetailModal.tsx
git commit -m "fix: add missing imports for showToast and X icon"
```

## Task 3: Fix Property Name Mismatches in LotDetailModal

**Objective:** Resolve "Property does not exist" errors by correcting camelCase/snake_case mismatches.

**Files:**
- Modify: `components/Stock/LotDetailModal.tsx:151,155,171,175,179,183,187,190,191,207,215,220,222,227,232,240,243,252,255`

**Step 1: Write failing test (conceptual)**
- tsc should fail with TS2339/TS2551 errors for properties like `createur_nom`, `livraison_id`, etc.

**Step 2: Run test to verify failure**
```
tsc --noEmit components/Stock/LotDetailModal.tsx
```
Expected: FAIL with property not found errors

**Step 3: Write minimal implementation**
Replace incorrect property names with correct ones from LotActif interface:
- `createur_nom` → `produitCreateurNom` 
- `createur_par` → `produitCreateurBy` (or check actual field)
- `livraison_id` → `livraisonId`
- `livraison_item_id` → `livraisonItemId`
- `date_arrivee` → `dateArrivee`
- `pdv_id` → `pdvId`
- `created_at` → `createdAt`
- `created_by` → `createdBy`
- `prix_initial` → `prixInitial`
- `quantite_actuelle` → `quantiteActuelle`
- `quantite_initiale` → `quantiteInitiale`
- `ventes_fermees` → `ventesFermees`
- `chiffre_affaires` → `chiffreAffaires`
- `quantite_vendue` → `quantiteVendue`

**Step 4: Run test to verify pass**
```
tsc --noEmit components/Stock/LotDetailModal.tsx
```
Expected: PASS (no property not found errors)

**Step 5: Commit**
```bash
git add components/Stock/LotDetailModal.tsx
git commit -m "fix: correct property name mismatches in LotDetailModal"
```

## Task 4: Fix ActionMenu Type Mismatch in LotExplorer

**Objective:** Resolve TS2322 error: ActionMenuId vs string type mismatch.

**Files:**
- Modify: `components/Stock/LotExplorer.tsx:23, 229`

**Step 1: Write failing test (conceptual)**
- tsc should fail with TS2322: Type '(actionId: string, lot: any) => void' is not assignable to type '(actionId: ActionMenuId, lot: LotActif) => void'

**Step 2: Run test to verify failure**
```
tsc --noEmit components/Stock/LotExplorer.tsx
```
Expected: FAIL with TS2322 error

**Step 3: Write minimal implementation**
```diff
-export function LotExplorer({
-  produit,
-  onClose,
-  collaborateurs,
-  pointsDeVente,
-  lots,
-  onLotAction,
-}: {
-  produit: ProduitCatalogue;
-  onClose: () => void;
-  collaborateurs: Record<string, Collaborateur>;
-  pointsDeVente: Record<string, PointDeVente>;
-  lots: LotActif[];
-  onLotAction?: (actionId: string, lot: any) => void;
-}) {
+export function LotExplorer({
+  produit,
+  onClose,
-  collaborateurs,
-  pointsDeVente,
-  lots,
-  onLotAction,
-}: {
+  produit: ProduitCatalogue;
+  onClose: () => void;
+  collaborateurs: Record<string, Collaborateur>;
+  pointsDeVente: Record<string, PointDeVente>;
+  lots: LotActif[];
+  onLotAction?: (actionId: import("./ActionMenu").ActionMenuId, lot: LotActif) => void;
+}) {
```

**Step 4: Run test to verify pass**
```
tsc --noEmit components/Stock/LotExplorer.tsx
```
Expected: PASS (no type mismatch errors)

**Step 5: Commit**
```bash
git add components/Stock/LotExplorer.tsx
git commit -m "fix: correct ActionMenu type in LotExplorer onLotAction prop"
```

## Task 5: Verify Global TypeScript Configuration

**Objective:** Ensure tsconfig.json is properly configured for the project.

**Files:**
- Inspect: `tsconfig.json`

**Step 1: Verify JSX configuration**
- Confirm `"jsx": "react-jsx"` is present
- Confirm `"baseUrl": "."` and paths are correct

**Step 2: Test full compilation**
```
tsc --noEmit
```
Expected: Should now show significantly fewer errors (primarily any remaining logic/type issues)

**Step 3: Address any remaining errors**
- If any persist, handle them individually following the same pattern

**Step 5: Commit**
```bash
git add tsconfig.json (if changed)
git commit -m "chore: verify/fix tsconfig.json for proper JSX and path resolution"
```

## Validation Criteria

**Definition of Done:** Running `tsc --noEmit` from project root produces zero errors.

**Verification Steps:**
1. `cd /c/Workspace/Pejaa/next_app`
2. `npx tsc --noEmit`
3. Observe output shows no errors (may show warnings which are acceptable)

**Success Metrics:**
- Before: ~50+ TS errors (module not found, property not found, etc.)
- After: 0 TS errors

## Risk Mitigation

- **Risk:** Changing property names might break runtime if data doesn't match
  - **Mitigation:** Verify Prisma schema and API responses match corrected property names
  
- **Risk:** Import changes might break in development if path aliases not configured
  - **Mitigation:** Verify `tsconfig.json` paths section includes `@/*` mapping

## Next Steps After Completion

Once TypeScript compiles cleanly:
1. Proceed with BATCH 5 implementation (Sale Cancellation feature)
2. Implement BATCH 6 (RBAC unification) if needed
3. Enhance BATCH 7 (Stock Logs Ledger) with additional details
4. Run application to verify no regressions introduced

--- 

**Estimated Time:** 2-4 hours for complete fix implementation