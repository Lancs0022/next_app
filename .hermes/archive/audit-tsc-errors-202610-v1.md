# Pejaa Project TypeScript Error Audit - 2026-07-10

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Document all current TypeScript compilation errors in the Pejaa Next.js application, identify which batches have been implemented vs. what's broken, and establish a comprehensive bug tracking baseline.

**Architecture:** Next.js 15+ App Router with TypeScript, Prisma ORM, Redux, and custom component library. The application follows a feature-sliced architecture with app/ routes and shared components.

**Tech Stack:** Next.js 15, TypeScript 5, React 18, Prisma ORM, Redux Toolkit, Tailwind CSS, Zod (inferred), Lucide Icons

---

## Current State Analysis

### ✅ Implemented Features (Based on File Evidence)

1. **Stock Management System**
   - Complete LotDetailModal with stock movement tracking
   - LotExplorer with card/list views
   - ActionMenu with vendre/ajuster/transfert/prix actions
   - Stock movement history table with type badges
   - Financial calculations (chiffre affaires, bénéfice)
   - Created `quantiteVendue` field in LotActif type

2. **Authentication & Authorization**
   - AuthContext with JWT-based session management
   - `withAuth` higher-order function for route protection
   - RBAC system with roles, domains, and matrix permissions
   - Tenant isolation via X-Tenant-Id header and JWT claims

3. **UI Component Library**
   - Toast notification system (ToastContainer/Toast)
   - Theme switching (soleil/ocean) with dark/light mode
   - Badge system (CategoryBadge, CollabBadge, PDVBadge, StockRatioBadge)
   - Formatting utilities (fr-FR numbers, dates, currency)
   - Reusable components (Drawer, DateRangeFilter, MultiSelectTags)

4. **API Routes**
   - Protected stock movement endpoints with proper tenant isolation
   - Authentication middleware with role-based access control
   - Prisma integration with proper error handling

### ❌ Current TypeScript Compilation Errors

#### Critical Path Errors (Blocking Development)

1. **Module Resolution Issues** (`app/api/stock/lots/[id]/mouvements/route.ts:2-3`)
   - Cannot find module `../../../lib/auth` or `../../../lib/db`
   - **Root Cause:** Incorrect relative path depth - should be `@/lib/auth` and `@/lib/db`
   - **Impact:** Prevents compilation of stock movement API route

2. **Missing JSX Configuration** (`app/ventes/page.tsx:154+`)
   - Multiple "Cannot use JSX unless the '--jsx' flag is provided" errors
   - **Root Cause:** tsconfig.js has `jsx: "react-jsx"` but tsc is being run without proper configuration
   - **Impact:** Prevents compilation of VentesPage component

3. **Type Safety Violations** (Throughout codebase)
   - Implicit `any` types in API route parameters
   - Property access on possibly undefined objects
   - Type mismatches between ActionMenuId and string parameters
   - Missing property names (camelCase vs snake_case mismatches)

#### Component-Specific Issues

**LotDetailModal.tsx:**
- Line 71, 81: `showToast` not imported/undefined
- Line 112: `<X />` icon not imported from lucide-react
- Line 151: `createur_nom` property doesn't exist on ProduitCatalogue (should be `createur_par` or similar)
- Line 155: `createur_par` property doesn't exist
- Lines 171, 175, 179, 183, 187, 190, 190, 191, 207, 207, 215, 220, 222, 227, 232, 240, 240, 240, 243, 252, 255: Property name mismatches (camelCase vs snake_case)

**ActionMenu Type Issues:**
- LotExplorer.tsx line 23: `onLotAction` expects `ActionMenuId` but receives `string | null`
- ActionMenu.tsx line 43: `onAction` expects `ActionMenuId` but receives `string` in LotDetailModal

#### Database/Type Mapping Issues
- Multiple property name mismatches between database snake_case and TypeScript camelCase interfaces
- Missing computed fields in mapped types
- Inconsistent property naming in LivraisonItem vs database schema

## Batch Implementation Status Analysis

Based on the code audit, here's what appears to have been implemented:

### BATCH 5: Sale Cancellation Implementation ❌ NOT IMPLEMENTED
- No "Annuler la vente" action in Ventes page ActionMenu
- No `quantite_retournee` column in vente_article table (via Prisma schema)
- No compensating ledger entries in transaction_financiere
- No stock_mouvement entries with type=annulation_vente

### BATCH 6: RBAC Unification ❌ NOT IMPLEMENTED
- No evidence of `app/(admin)` folder structure being moved to `app/`
- Authorization still handled at layout/component level via `withAuth` wrapper
- No centralized role-based routing protection

### BATCH 7: Stock Logs Ledger ⚠️ PARTIALLY IMPLEMENTED
- LotDetailModal shows stock movements table (Section 4: Mouvements de stock)
- Missing: descriptive sub-grid/text-field block showing ALL historical stock_mouvement entries
- Current implementation shows basic table but lacks detailed formatting/export capabilities

## Root Cause Analysis

1. **Path Configuration Issues**: Relative path imports vs. TypeScript path aliases mismatch
2. **TypeScript Configuration**: jsx configuration not properly applied during tsc execution
3. **Type Safety Gaps**: Missing imports, incorrect property names, loose typing
4. **Feature Incompleteness**: Batches 5-7 show minimal to no implementation evidence
5. **Database Synchronization**: TypeScript interfaces not kept in sync with Prisma schema

## Risk Assessment

- **High Risk**: Module resolution errors prevent any development/workflow
- **Medium Risk**: Type safety issues could lead to runtime bugs
- **Low to Medium Risk**: Missing features represent incomplete functionality but don't block current operation

## Recommended Immediate Actions

1. Fix TypeScript configuration and module resolution
2. Address all "Cannot find module" and JSX flag errors
3. Resolve type safety issues in critical paths (API routes, modals)
4. Implement missing batch features based on architectural guidelines