-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "utilisateur" (
    "id_utilisateur" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id_utilisateur")
);

-- CreateTable
CREATE TABLE "access_domain" (
    "id_domain" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "access_domain_pkey" PRIMARY KEY ("id_domain")
);

-- CreateTable
CREATE TABLE "user_access_override" (
    "id_utilisateur" INTEGER NOT NULL,
    "id_domain" INTEGER NOT NULL,
    "can_read" BOOLEAN,
    "can_write" BOOLEAN,
    "can_delete" BOOLEAN,
    "can_manage" BOOLEAN,

    CONSTRAINT "user_access_override_pkey" PRIMARY KEY ("id_utilisateur","id_domain")
);

-- CreateTable
CREATE TABLE "role" (
    "id_role" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id_role")
);

-- CreateTable
CREATE TABLE "role_access_matrix" (
    "id_role" INTEGER NOT NULL,
    "id_domain" INTEGER NOT NULL,
    "can_read" BOOLEAN NOT NULL DEFAULT false,
    "can_write" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_manage" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "role_access_matrix_pkey" PRIMARY KEY ("id_role","id_domain")
);

-- CreateTable
CREATE TABLE "stock_actuel" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "id_lot" INTEGER NOT NULL,
    "id_pdv" INTEGER NOT NULL,
    "quantite" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "quantite_reservee" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_actuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_snapshot" (
    "id_snapshot" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "id_pdv" INTEGER NOT NULL,
    "periode" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_snapshot_pkey" PRIMARY KEY ("id_snapshot")
);

-- CreateTable
CREATE TABLE "snapshot_ligne" (
    "id_ligne" SERIAL NOT NULL,
    "id_snapshot" INTEGER NOT NULL,
    "id_produit" INTEGER NOT NULL,
    "quantite" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "snapshot_ligne_pkey" PRIMARY KEY ("id_ligne")
);

-- CreateTable
CREATE TABLE "stock_mouvement" (
    "id_stock_mouvement" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "id_lot" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "quantite" DECIMAL(12,3) NOT NULL,
    "before_qty" DECIMAL(12,3),
    "after_qty" DECIMAL(12,3),
    "source_type" TEXT NOT NULL,
    "source_id" INTEGER,
    "date_mouvement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,

    CONSTRAINT "stock_mouvement_pkey" PRIMARY KEY ("id_stock_mouvement")
);

-- CreateTable
CREATE TABLE "stock_transfert" (
    "id_stock_transfert" SERIAL NOT NULL,
    "id_point_vente_source" INTEGER NOT NULL,
    "id_point_vente_destination" INTEGER NOT NULL,
    "id_utilisateur" INTEGER NOT NULL,
    "date_transfert" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentaire" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3),
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stock_transfert_pkey" PRIMARY KEY ("id_stock_transfert")
);

-- CreateTable
CREATE TABLE "produit_catalogue" (
    "id_produit" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "id_collaborateur" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "categorie" TEXT,
    "sku" TEXT,
    "unite" TEXT,
    "seuil_alerte" INTEGER,
    "image_url" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'actif',
    "created_by" INTEGER,
    "modified_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "modified_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "produit_catalogue_pkey" PRIMARY KEY ("id_produit")
);

-- CreateTable
CREATE TABLE "collaborateur" (
    "id_collaborateur" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "poste" TEXT,
    "adresse" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'actif',
    "date_adhesion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaborateur_pkey" PRIMARY KEY ("id_collaborateur")
);

-- CreateTable
CREATE TABLE "point_de_vente" (
    "id_pdv" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "quartier" TEXT,
    "ville" TEXT,
    "adresse" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "responsable_id" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'actif',
    "date_ouverture" TIMESTAMP(3),
    "date_fermeture" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_de_vente_pkey" PRIMARY KEY ("id_pdv")
);

-- CreateTable
CREATE TABLE "livraison" (
    "id_livraison" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "id_collaborateur" INTEGER NOT NULL,
    "id_pdv" INTEGER NOT NULL,
    "client_uuid" TEXT,
    "date_livraison" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "commentaire" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livraison_pkey" PRIMARY KEY ("id_livraison")
);

-- CreateTable
CREATE TABLE "livraison_item" (
    "id_lot" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "id_produit" INTEGER NOT NULL,
    "id_livraison" INTEGER NOT NULL,
    "id_pdv" INTEGER NOT NULL,
    "prix_initial" DECIMAL(10,2) NOT NULL,
    "marge" DECIMAL(10,2) NOT NULL,
    "quantite_initiale" DECIMAL(12,3) NOT NULL,
    "quantite_remboursee" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "id_lot_parent" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'en_stock',
    "date_livraison" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "modified_by" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "livraison_item_pkey" PRIMARY KEY ("id_lot")
);

-- CreateTable
CREATE TABLE "commande" (
    "id_commande" SERIAL NOT NULL,
    "id_client" INTEGER NOT NULL,
    "id_pdv" INTEGER NOT NULL,
    "cree_par_id" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'reservee',
    "date_commande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commande_pkey" PRIMARY KEY ("id_commande")
);

-- CreateTable
CREATE TABLE "commande_ligne" (
    "id" SERIAL NOT NULL,
    "id_commande" INTEGER NOT NULL,
    "id_lot" INTEGER NOT NULL,
    "id_collaborateur" INTEGER NOT NULL,
    "quantite_reservee" INTEGER NOT NULL,
    "prix_initial" DECIMAL(10,2) NOT NULL,
    "marge" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commande_ligne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client" (
    "id_client" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "date_inscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id_client")
);

-- CreateTable
CREATE TABLE "vente" (
    "id_vente" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "id_commande" INTEGER,
    "id_client" INTEGER NOT NULL,
    "id_point_vente" INTEGER NOT NULL,
    "client_uuid" TEXT,
    "date_vente" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enregistre_par_admin_id" INTEGER NOT NULL,
    "id_utilisateur" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'payee',
    "montant_ht" DECIMAL(15,2),
    "montant_tva" DECIMAL(15,2) DEFAULT 0,
    "montant_marge" DECIMAL(15,2),
    "montant_total" DECIMAL(15,2),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "raison_suppression" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vente_pkey" PRIMARY KEY ("id_vente")
);

-- CreateTable
CREATE TABLE "vente_article" (
    "id_ligne" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "id_vente" INTEGER NOT NULL,
    "id_lot" INTEGER NOT NULL,
    "id_collaborateur" INTEGER NOT NULL,
    "quantite_vendue" INTEGER NOT NULL,
    "prix_initial" DECIMAL(10,2) NOT NULL,
    "marge" DECIMAL(10,2) NOT NULL,
    "montant_ht" DECIMAL(15,2),
    "montant_tva" DECIMAL(15,2) DEFAULT 0,
    "montant_marge" DECIMAL(15,2),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vente_article_pkey" PRIMARY KEY ("id_ligne")
);

-- CreateTable
CREATE TABLE "encaissement" (
    "id_encaissement" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "id_vente" INTEGER NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'cash',
    "reference" TEXT,
    "date_encaissement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cree_par_id" INTEGER NOT NULL,

    CONSTRAINT "encaissement_pkey" PRIMARY KEY ("id_encaissement")
);

-- CreateTable
CREATE TABLE "transaction_financiere" (
    "id_transaction_financiere" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL,
    "date_transaction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_categorie_financiere" INTEGER NOT NULL,
    "description" TEXT,
    "source_module" TEXT NOT NULL,
    "source_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "transaction_financiere_pkey" PRIMARY KEY ("id_transaction_financiere")
);

-- CreateTable
CREATE TABLE "financial_category" (
    "id_category" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_category_pkey" PRIMARY KEY ("id_category")
);

-- CreateTable
CREATE TABLE "abonnement" (
    "id_abonnement" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "periodicite" TEXT NOT NULL,
    "impact_type" TEXT,
    "impact_montant" DECIMAL(10,2),
    "impact_pourcentage" DECIMAL(5,2),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abonnement_pkey" PRIMARY KEY ("id_abonnement")
);

-- CreateTable
CREATE TABLE "abonnement_paiement" (
    "id_paiement" SERIAL NOT NULL,
    "id_abonnement" INTEGER NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "date_paiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abonnement_paiement_pkey" PRIMARY KEY ("id_paiement")
);

-- CreateTable
CREATE TABLE "abonnement_collaborateur" (
    "id_abonnement" INTEGER NOT NULL,
    "id_collaborateur" INTEGER NOT NULL,
    "date_debut" TIMESTAMP(3),
    "date_fin" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abonnement_collaborateur_pkey" PRIMARY KEY ("id_abonnement","id_collaborateur")
);

-- CreateTable
CREATE TABLE "stock_ajustement" (
    "id_stock_ajustement" SERIAL NOT NULL,
    "id_lot" INTEGER NOT NULL,
    "id_utilisateur" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "quantite" DECIMAL(12,3) NOT NULL,
    "motif" TEXT,
    "date_ajustement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL DEFAULT 'valide',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3),
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stock_ajustement_pkey" PRIMARY KEY ("id_stock_ajustement")
);

-- CreateTable
CREATE TABLE "retour_collaborateur" (
    "id_retour_collaborateur" SERIAL NOT NULL,
    "id_lot" INTEGER NOT NULL,
    "id_collaborateur" INTEGER NOT NULL,
    "id_utilisateur" INTEGER NOT NULL,
    "quantite_retournee" INTEGER NOT NULL,
    "date_retour" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motif" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMP(3),
    "updated_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "retour_collaborateur_pkey" PRIMARY KEY ("id_retour_collaborateur")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "access_domain_code_key" ON "access_domain"("code");

-- CreateIndex
CREATE UNIQUE INDEX "role_code_key" ON "role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_actuel_tenant_id_id_lot_id_pdv_key" ON "stock_actuel"("tenant_id", "id_lot", "id_pdv");

-- CreateIndex
CREATE UNIQUE INDEX "livraison_tenant_id_client_uuid_key" ON "livraison"("tenant_id", "client_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "vente_tenant_id_client_uuid_key" ON "vente"("tenant_id", "client_uuid");

-- AddForeignKey
ALTER TABLE "user_access_override" ADD CONSTRAINT "user_access_override_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_access_override" ADD CONSTRAINT "user_access_override_id_domain_fkey" FOREIGN KEY ("id_domain") REFERENCES "access_domain"("id_domain") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_access_matrix" ADD CONSTRAINT "role_access_matrix_id_role_fkey" FOREIGN KEY ("id_role") REFERENCES "role"("id_role") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_access_matrix" ADD CONSTRAINT "role_access_matrix_id_domain_fkey" FOREIGN KEY ("id_domain") REFERENCES "access_domain"("id_domain") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_ligne" ADD CONSTRAINT "snapshot_ligne_id_snapshot_fkey" FOREIGN KEY ("id_snapshot") REFERENCES "stock_snapshot"("id_snapshot") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livraison_item" ADD CONSTRAINT "livraison_item_id_livraison_fkey" FOREIGN KEY ("id_livraison") REFERENCES "livraison"("id_livraison") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_ligne" ADD CONSTRAINT "commande_ligne_id_commande_fkey" FOREIGN KEY ("id_commande") REFERENCES "commande"("id_commande") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vente_article" ADD CONSTRAINT "vente_article_id_vente_fkey" FOREIGN KEY ("id_vente") REFERENCES "vente"("id_vente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnement_paiement" ADD CONSTRAINT "abonnement_paiement_id_abonnement_fkey" FOREIGN KEY ("id_abonnement") REFERENCES "abonnement"("id_abonnement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnement_collaborateur" ADD CONSTRAINT "abonnement_collaborateur_id_abonnement_fkey" FOREIGN KEY ("id_abonnement") REFERENCES "abonnement"("id_abonnement") ON DELETE RESTRICT ON UPDATE CASCADE;
