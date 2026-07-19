/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,client_uuid]` on the table `collaborateur` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "collaborateur" ADD COLUMN     "client_uuid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "collaborateur_tenant_id_client_uuid_key" ON "collaborateur"("tenant_id", "client_uuid");
