/*
  Warnings:

  - You are about to alter the column `quantite_reservee` on the `commande_ligne` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - You are about to alter the column `seuil_alerte` on the `produit_catalogue` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,3)`.
  - You are about to alter the column `quantite_retournee` on the `retour_collaborateur` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.
  - You are about to alter the column `quantite_vendue` on the `vente_article` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(12,3)`.

*/
-- AlterTable
ALTER TABLE "commande_ligne" ALTER COLUMN "quantite_reservee" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "produit_catalogue" ADD COLUMN     "id_unite" INTEGER,
ALTER COLUMN "seuil_alerte" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "retour_collaborateur" ALTER COLUMN "quantite_retournee" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "vente_article" ALTER COLUMN "quantite_vendue" SET DATA TYPE DECIMAL(12,3);

-- CreateTable
CREATE TABLE "unite_de_mesure" (
    "id_unite" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "est_decimal" BOOLEAN NOT NULL DEFAULT false,
    "precision" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unite_de_mesure_pkey" PRIMARY KEY ("id_unite")
);

-- CreateIndex
CREATE UNIQUE INDEX "unite_de_mesure_tenant_id_code_key" ON "unite_de_mesure"("tenant_id", "code");

-- AddForeignKey
ALTER TABLE "produit_catalogue" ADD CONSTRAINT "produit_catalogue_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "unite_de_mesure"("id_unite") ON DELETE SET NULL ON UPDATE CASCADE;
