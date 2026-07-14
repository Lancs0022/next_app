# Pejaa Project Status - Hermes Agent Memory

## Project Location
- **Root**: `C:\Workspace\Pejaa\next_app`
- **NOT** in user directory as previously assumed

## Current Status Assessment

### ✅ Working Components
- Authentication system (JWT + cookies)
- Role-based access control (RBAC) with domain/matrix/override
- Tenant isolation (multi-tenant ready)
- Stock management core (LotExplorer, LotDetailModal)
- UI component library (badges, formatters, toast, theme)
- API route protection with `withAuth` HOC

### ❌ Critical Blockers
1. **Module Resolution Errors**:
   - `app/api/stock/lots/[id]/mouvements/route.ts`: Cannot find `../../lib/auth` and `../../lib/db`
   - Should use `@/lib/auth` and `@/lib/db` per tsconfig paths

2. **JSX Configuration**:
   - Multiple files report "Cannot use JSX unless the '--jsx' flag is provided"
   - tsconfig.json shows `jsx: "react-jsx"` but tsc not picking it up properly

3. **Type Safety Issues**:
   - Implicit `any` types in API route parameters
   - Property name mismatches (camelCase vs snake_case)
   - Missing imports (showToast, X icon)

### 📋 Batch Implementation Status

#### BATCH 5: Sale Cancellation Implementation ❌ NOT STARTED
- **Target**: `app/ventes/page.tsx`
- **Required**: 
  - Add "Annuler la vente" action next to "Voir détails"
  - Side effects: 
    - Append to `ventes` table (negative balance + raison_suppression)
    - Append to `stock_mouvement` (type: 'annulation_vente') 
    - Create compensating ledger entry in `transaction_financiere`
  - **Architecture Note**: Should follow stock_actuel/stock_mouvement pattern - add `quantite_retournee` column to `vente_article` table

#### BATCH 6: RBAC Unification ❌ NOT STARTED
- **Target**: Remove `app/(admin)/*` duplication, move to `app/*`
- **Current**: No `(admin)` folder exists - RBAC handled via `withAuth` middleware and layout-level protection
- **Required**: 
  - Verify if any admin-specific routes exist that need consolidation
  - Implement centralized route protection if not already present

#### BATCH 7: Stock Logs Ledger ⚠️ PARTIALLY DONE
- **Target**: Bottom section of `LotDetailModal.tsx`
- **Current**: 
  - Shows stock movements table (Section 4: Mouvements de stock)
  - Missing: descriptive sub-grid/text-field block showing ALL historical `stock_mouvement` entries
  - Need to enhance existing movements section with more detailed formatting

## Immediate Next Steps

1. **Fix TypeScript Configuration**:
   - Verify `tsconfig.json` is being used correctly
   - Check if `jsx: "react-jsx"` is properly applied
   - Ensure path aliases work during tsc execution

2. **Resolve Module Resolution**:
   - Fix relative imports in `app/api/stock/lots/[id]/mouvements/route.ts`
   - Change `../../lib/auth` → `@/lib/auth`
   - Change `../../lib/db` → `@/lib/db`

3. **Address Immediate Type Errors**:
   - Import missing dependencies (`showToast`, `X` icon)
   - Fix property name mismatches in LotDetailModal
   - Correct ActionMenu type mismatches

4. **Begin Batch Implementation**:
   - Start with BATCH 5 (Sale Cancellation) as it's most clearly defined
   - Follow the stock_actuel/stock_mouvement pattern for `vente_article` table

## Files Modified in This Session

1. `.hermes\plans\audit-tsc-errors-202610.md` - Comprehensive error audit
2. `memory` - Project location tracking (previously set)
3. This memory file - Current status and next steps

## Blockers
- None currently blocking progress beyond the TypeScript compilation issues
- Once tsc passes, can proceed with batch implementations

## Ready for Next Action
Ready to execute BATCH 5 implementation once TypeScript errors are resolved, or to begin fixing the compilation issues immediately.