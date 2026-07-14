# Batch 5: Sale Cancellation Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Implement the "Annuler la vente" (sale cancellation) feature in the Ventes page, including UI action, API endpoint, and business logic to reverse a sale by creating a reversed vente entry, updating quantite_retournee, creating a stock_mouvement of type annulation_vente, and creating a compensating transaction_financiere.

**Architecture:** 
- Frontend: Add action button in the Actions column of both atomique and agrege tables in `app/ventes/page.tsx`. Show a prompt to enter cancellation reason, then call the new API endpoint.
- Backend: Create a new API route `app/api/ventes/[id]/annuler/route.ts` that performs the cancellation in a Prisma transaction.
- Business logic: Fetch the vente with its articles, create a reversal vente, update quantite_retournee on each vente_article, create stock_mouvement entries (type: annulation_vente), and create a transaction_financiere entry (type: OUT) with negative amount.
- All operations run in a single Prisma transaction to ensure atomicity.

**Tech Stack:** Next.js 15 (App Router), TypeScript 5, React 18, Prisma ORM, Tailwind CSS.

---

## Task 1: Add Cancellation Action to Ventes Page

**Objective:** Allow users to trigger cancellation from the ventes table.

**Files:**
- Modify: `app/ventes/page.tsx` (atomiqueColumns and aggregeColumns actions)

**Step 1: Write failing test (conceptual)**
- The actions column currently only returns `[{ label: 'Voir détails', onClick: () => handleRowClick(row) }]`. After the change, it should also return an annulation action.

**Step 2: Run test to verify failure**
- Check that the actions column does not contain an annulation option (manual inspection or unit test if available).

**Step 3: Write implementation**
- In both `atomiqueColumns` and `agregeade`, modify the `getActions` function to return:
  ```ts
  return [
    { label: 'Voir détails', onClick: () => handleRowClick(row) },
    {
      label: 'Annuler la vente',
      onClick: () => {
        // Open a prompt to get reason, then call API
        const reason = window.prompt('Raison de l\'annulation :');
        if (reason !== null && reason.trim() !== '') {
          cancelVente(row.id_vente, reason.trim());
        }
      }
    }
  ];
  ```
- Define `cancelVente` async function that calls `/api/ventes/${id}/annuler` with POST and reason.

**Step 4: Run test to verify pass**
- Verify that the UI shows the new button and clicking it prompts for reason and calls the API (can be checked via network tab).
- After code changes, run `npx tsc --noEmit` to ensure no TypeScript errors.

**Step 5: No commit – await explicit approval.**
(Do not run git add/commit; wait for user instruction.)

---

## Task 2: Create Cancellation API Route

**Objective:** Implement the backend endpoint to handle vente cancellation.

**Files:**
- Create: `app/api/ventes/[id]/annuler/route.ts`

**Step 1: Write failing test (conceptual)**
- POST to `/api/ventes/1/annuler` should return 404 (not implemented) currently.

**Step 2: Run test to verify failure**
- Send a POST request (e.g., via curl or Postman) and expect 404.

**Step 3: Write implementation**
- Import `NextResponse`, `prisma` from '@/lib/db', and `withAuth` from '@/lib/auth'.
- Define `async function POST(req, { params })`:
  - Authenticate user via `withAuth` (domain: 'VENTE', action: 'write').
  - Parse `id` from params, convert to number.
  - Extract reason from request body (JSON `{ reason: string }`).
  - Validate reason not empty.
  - Start Prisma transaction:
    1. Fetch the original vente with its articles: `prisma.vente.findUnique({ where: { id: venteId }, include: { articles: true } })`.
    2. If not found, throw error.
    3. Compute totals: sum of article.prix_initial * article.quantite_vendue for montant_ht, etc. (or use existing fields if stored).
    4. Create the reversalvente:
       ```ts
       const reversalVente = await prisma.vente.create({
         data: {
           tenant_id: vente.tenant_id,
           id_client: vente.id_client,
           id_point_vente: vente.id_point_vente,
           client_uuid: vente.client_uuid,
           date_vente: new Date(),
           enregistre_par_admin_id: user.id_utilisateur,
           id_utilisateur: user.id_utilisateur,
           statut: 'annulee',
           raison_suppression: reason,
           montant_ht: -totalHt,
           montant_tva: -totalTva,
           montant_marge: -totalMarge,
           montant_total: -totalTotal,
           deleted: false,
           articles: {
             create: vente.articles.map(art => ({
               quantite_vendue: -art.quantite_vendue,
               prix_initial: art.prix_initial,
               marge: art.marge,
               montant_ht: -art.montant_ht ?? 0,
               montant_tva: -art.montant_tva ?? 0,
               montant_marge: -art.montant_marge ?? 0,
               quantite_retournee: art.quantite_vendue, // returned quantity
             }))
           }
         }
       });
       ```
    5. For each original article, update its `quantite_retournee`:
       ```ts
       for (const article of vente.articles) {
         await prisma.venteArticle.update({
           where: { id_ligne: article.id_ligne },
           data: { 
             quantite_retournee: { 
               increment: article.quantite_vendue 
             } 
           }
         });
       }
       ```
    6. **After updating quantite_retournee, verify total return:**
       - Compute `totalRetourne = vente.articles.reduce((sum, a) => sum + a.quantite_vendue, 0)`
       - Compute `totalVenduOriginal = vente.articles.reduce((sum, a) => sum + a.quantite_vendue, 0)` (same as above, but we already have it)
       - Actually total vendu original is the same as totalRetourne because we are returning the full quantity.
       - If `totalRetourne` equals the original total vendu (which it will for full cancellation), set the original vente statut to 'annulee':
         ```ts
         await prisma.vente.update({
           where: { id: venteId },
           data: { statut: 'annulee' }
         });
         ```
    7. Create stock_mouvement entries for each article:
       - Need to get current stock_actuel for the lot and pdv to compute before/after.
       - For each article:
         ```ts
         const stockActuel = await prisma.stockActuel.findUnique({
           where: { tenant_id: vente.tenant_id, id_lot: article.id_lot, id_pdv: vente.id_point_vente }
         });
         const before = stockActuel?.quantite ?? 0;
         const after = before + article.quantite_vendue; // adding back the sold quantity
         await prisma.stockMouvement.create({
           data: {
             tenant_id: vente.tenant_id,
             id_lot: article.id_lot,
             type: 'annulation_vente',
             quantite: article.quantite_vendue, // positive to increase stock
             before_qty: before,
             after_qty: after,
             source_type: 'VENTE',
             source_id: venteId,
             date_mouvement: new Date(),
             created_by: user.id_utilisateur
           }
         });
         ```
    8. Create transaction_financiere:
       ```ts
       await prisma.transactionFinanciere.create({
         data: {
           tenant_id: vente.tenant_id,
           type: 'OUT',
           montant: -totalTotal, // negative amount (money out)
           date_transaction: new Date(),
           id_categorie_financiere: /* need to get a default category, maybe find one with code 'VENTE_ANNULATION' or first */,
           description: `Annulation vente #${vente.id_vente}: ${reason}`,
           source_module: 'VENTE',
           source_id: venteId,
           created_by: user.id_utilisateur
         }
       });
       ```
  - Return success response.

**Step 4: Run test to verify pass**
- After implementation, call the endpoint with a valid vente id and reason; expect 200 OK and the database changes.
- Run `npx tsc --noEmit` to ensure no TypeScript errors.

**Step 5: No commit – await explicit approval.**
(Do not run git add/commit; wait for user instruction.)

---

## Task 3: Refactor Cancellation Logic into a Service (Optional but Recommended)

**Objective:** Keep the route handler thin and reuse logic if needed.

**Files:**
- Create: `lib/venteCancellationService.ts` (or put in existing service folder)

**Step 1: Write failing test (conceptual)**
- No direct test; just ensure separation of concerns.

**Step 2: Implementation**
- Export an async function `cancelVente(venteId: number, reason: string, userId: number)` that contains the transaction logic from Task 2.
- The route handler then simply validates input, authenticates, and calls this service.

**Step 3: Update route to use service.**

**Step 4: Run test to verify pass**
- After changes, run `npx tsc --noEmit` to ensure no TypeScript errors.

**Step 5: No commit – await explicit approval.**
(Do not run git add/commit; wait for user instruction.)

---

## Task 4: Test End-to-End Flow

**Objective:** Verify that the cancellation works correctly in the UI and updates the database as expected.

**Files:**
- No specific file changes; manual testing.

**Steps:**
1. Start the dev server (`npm run dev`).
2. Log in as a user with VENTE write permission.
3. Navigate to the ventes page.
4. Find a vente, click Annuler la vente, enter a reason.
5. Confirm that:
   - A new vente appears with negative amounts and statut 'annulee'.
   - Each related vente_article has its quantite_retournee increased by the sold quantity.
   - A new stock_mouvement with type 'annulation_vente' appears for each article.
   - A new transaction_financiere with type OUT and negative amount appears.
   - Additionally, verify that the **original vente** (the one being cancelled) now has its statut set to 'annulee' (if total returned equals total vendu).
6. Ensure no errors in console or network.

**After verification, run `npx tsc --noEmit` one final time to ensure the codebase still compiles cleanly.**

**Step: No commit – await explicit approval.**
(Do not run git add/commit; wait for user instruction.)

---

## Validation Criteria

**Definition of Done:** 
- The UI presents an "Annuler la vente" action in the ventes table.
- Clicking it prompts for a reason and, upon submission, calls the API without errors.
- The database reflects:
  - A new vente record with negative financial fields and the provided raison_suppression.
  - Each related vente_article has its quantite_retournee increased by the original quantite_vendue.
  - For each article, a stock_mouvement of type 'annulation_vente' is created with quantity equal to the original sold quantity (increasing stock).
  - A transaction_financiere of type OUT with negative amount equal to the original totale is created.
  - The **original vente** has its statut updated to 'annulee' when the returned quantity equals the originally sold quantity (full cancellation).
- All operations are atomic; if any step fails, no partial changes are persisted.
- No existing functionality is regressed (existing ventes, stock movements, etc. still work).

**Success Metrics:**
- Manual verification as above.
- After implementation and verification, run `npx tsc --noEmit` and confirm 0 errors.
- Automated test could be added later, but for now manual check suffices.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Incorrect stock quantity calculation (sign errors) | Verify with a known vente: compute expected before/after quantities and compare to database after cancellation. |
| Missing financial category for transaction_financiere | Use a default category (e.g., find one with code 'VENTE_ANNULATION' or create a fallback to the first active category). |
| Concurrent updates causing lost updates on quantite_retournee | Use Prisma's increment operation (as shown) which is safe within a transaction. |
| Performance impact on large ventes (many articles) | The operation is proportional to number of articles; acceptable for typical vente sizes. If needed, could batch raw SQL updates. |
| User cancels a vente that is already annulee | The vente's statut may already be 'annulee'; we still allow cancellation (creating another reversal) or block. We'll allow it as a new reversal (creates another negative vente). |

---

## Next Steps After Completion

Once this batch is done and verified:
- Proceed to BATCH 6 (RBAC unification) if needed.
- Or move to BATCH 7 (enhance stock logs ledger).
- Or begin feature development on top of the newly solid foundation.

---

**Estimated Time:** 4‑6 hours (including UI, API, service logic, and manual testing).

**Reminder:** Do NOT execute any git commands until explicitly instructed. After each task, run `npx tsc --noEmit` to confirm the TypeScript code compiles without errors. Only after all tasks are completed and the final end‑to‑end verification passes, and you have run a final `npx tsc --noEmit` with zero errors, should you request permission to commit.

---