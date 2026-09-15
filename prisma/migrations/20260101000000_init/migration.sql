-- ============================================================
-- Migration initiale consolidée — PEJAA
-- Remplace les 6 migrations précédentes en un seul fichier
-- reflétant l'état final du schéma Prisma.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS "public";

-- ==================== AUTH / RBAC ====================

CREATE TABLE "utilisateur" (
    "id_utilisateur"  SERIAL        NOT NULL,
    "tenant_id"       INTEGER       NOT NULL,
    "nom"             TEXT          NOT NULL,
    "prenom"          TEXT          NOT NULL,
    "email"           TEXT          NOT NULL,
    "password_hash"   TEXT          NOT NULL,
    "role"            TEXT          NOT NULL,
    "actif"           BOOLEAN       NOT NULL DEFAULT true,
    "created_at"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id_utilisateur")
);

CREATE TABLE "access_domain" (
    "id_domain"  SERIAL   NOT NULL,
    "code"       TEXT     NOT NULL,
    "label"      TEXT     NOT NULL,
    "actif"      BOOLEAN  NOT NULL DEFAULT true,
    CONSTRAINT "access_domain_pkey" PRIMARY KEY ("id_domain")
);

CREATE TABLE "user_access_override" (
    "id_utilisateur"  INTEGER   NOT NULL,
    "id_domain"       INTEGER   NOT NULL,
    "can_read"        BOOLEAN,
    "can_write"       BOOLEAN,
    "can_delete"      BOOLEAN,
    "can_manage"      BOOLEAN,
    CONSTRAINT "user_access_override_pkey" PRIMARY KEY ("id_utilisateur","id_domain")
);

CREATE TABLE "role" (
    "id_role"  SERIAL   NOT NULL,
    "code"     TEXT     NOT NULL,
    "label"    TEXT     NOT NULL,
    "actif"    BOOLEAN  NOT NULL DEFAULT true,
    CONSTRAINT "role_pkey" PRIMARY KEY ("id_role")
);

CREATE TABLE "role_access_matrix" (
    "id_role"    INTEGER  NOT NULL,
    "id_domain"  INTEGER  NOT NULL,
    "can_read"   BOOLEAN  NOT NULL DEFAULT false,
    "can_write"  BOOLEAN  NOT NULL DEFAULT false,
    "can_delete" BOOLEAN  NOT NULL DEFAULT false,
    "can_manage" BOOLEAN  NOT NULL DEFAULT false,
    CONSTRAINT "role_access_matrix_pkey" PRIMARY KEY ("id_role","id_domain")
);

-- ==================== STOCK ====================

CREATE TABLE "stock_actuel" (
    "id"                SERIAL        NOT NULL,
    "tenant_id"         INTEGER       NOT NULL,
    "id_lot"            INTEGER       NOT NULL,
    "id_pdv"            INTEGER       NOT NULL,
    "quantite"          DECIMAL(12,3) NOT NULL DEFAULT 0,
    "quantite_reservee" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "created_by"        INTEGER,
    "created_at"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "stock_actuel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_snapshot" (
    "id_snapshot"  SERIAL        NOT NULL,
    "tenant_id"    INTEGER       NOT NULL,
    "id_pdv"       INTEGER       NOT NULL,
    "periode"      TEXT          NOT NULL,
    "created_at"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_snapshot_pkey" PRIMARY KEY ("id_snapshot")
);

CREATE TABLE "snapshot_ligne" (
    "id_ligne"    SERIAL        NOT NULL,
    "id_snapshot" INTEGER       NOT NULL,
    "id_produit"  INTEGER       NOT NULL,
    "quantite"    DECIMAL(10,2) NOT NULL,
    CONSTRAINT "snapshot_ligne_pkey" PRIMARY KEY ("id_ligne")
);

CREATE TABLE "stock_mouvement" (
    "id_stock_mouvement"  SERIAL        NOT NULL,
    "tenant_id"           INTEGER       NOT NULL,
    "id_lot"              INTEGER       NOT NULL,
    -- type: entree | sortie | reservation | annulation_reservation | ajustement | transfert | annulation_vente
    "type"                TEXT          NOT NULL,
    "quantite"            DECIMAL(12,3) NOT NULL,
    "before_qty"          DECIMAL(12,3),
    "after_qty"           DECIMAL(12,3),
    -- source_type: VENTE | LIVRAISON | AJUSTEMENT | TRANSFERT | RETOUR
    "source_type"         TEXT          NOT NULL,
    "source_id"           INTEGER,
    "date_mouvement"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"          INTEGER,
    CONSTRAINT "stock_mouvement_pkey" PRIMARY KEY ("id_stock_mouvement")
);

CREATE TABLE "stock_transfert" (
    "id_stock_transfert"          SERIAL        NOT NULL,
    "id_point_vente_source"       INTEGER       NOT NULL,
    "id_point_vente_destination"  INTEGER       NOT NULL,
    "id_utilisateur"              INTEGER       NOT NULL,
    "date_transfert"              TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentaire"                 TEXT,
    "created_at"                  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"                  INTEGER,
    "updated_at"                  TIMESTAMP(3),
    "updated_by"                  INTEGER,
    "deleted_at"                  TIMESTAMP(3),
    CONSTRAINT "stock_transfert_pkey" PRIMARY KEY ("id_stock_transfert")
);

-- ==================== UNITÉS DE MESURE ====================

CREATE TABLE "unite_de_mesure" (
    "id_unite"    SERIAL        NOT NULL,
    "tenant_id"   INTEGER       NOT NULL,
    "code"        TEXT          NOT NULL,
    "label"       TEXT          NOT NULL,
    "est_decimal" BOOLEAN       NOT NULL DEFAULT false,
    "precision"   INTEGER       NOT NULL DEFAULT 0,
    "actif"       BOOLEAN       NOT NULL DEFAULT true,
    "created_at"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unite_de_mesure_pkey" PRIMARY KEY ("id_unite")
);

-- ==================== PRODUITS ====================

CREATE TABLE "produit_catalogue" (
    "id_produit"       SERIAL         NOT NULL,
    "tenant_id"        INTEGER        NOT NULL,
    "id_collaborateur" INTEGER        NOT NULL,
    "nom"              TEXT           NOT NULL,
    "description"      TEXT,
    "categorie"        TEXT,
    "sku"              TEXT,
    -- Champ legacy conservé pour compatibilité lectures ; utiliser id_unite
    "unite"            TEXT,
    "id_unite"         INTEGER,
    "seuil_alerte"     DECIMAL(10,3),
    "image_url"        TEXT,
    "statut"           TEXT           NOT NULL DEFAULT 'actif',
    "created_by"       INTEGER,
    "modified_by"      INTEGER,
    "created_at"       TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3)   NOT NULL,
    "modified_at"      TIMESTAMP(3),
    "deleted_at"       TIMESTAMP(3),
    CONSTRAINT "produit_catalogue_pkey" PRIMARY KEY ("id_produit")
);

-- ==================== COLLABORATEURS ====================

CREATE TABLE "collaborateur" (
    "id_collaborateur"  SERIAL        NOT NULL,
    "tenant_id"         INTEGER       NOT NULL,
    "nom"               TEXT          NOT NULL,
    "prenom"            TEXT,
    "email"             TEXT,
    "telephone"         TEXT,
    "poste"             TEXT,
    "adresse"           TEXT,
    "statut"            TEXT          NOT NULL DEFAULT 'actif',
    "client_uuid"       TEXT,
    "date_adhesion"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "collaborateur_pkey" PRIMARY KEY ("id_collaborateur")
);

-- ==================== POINTS DE VENTE ====================

CREATE TABLE "point_de_vente" (
    "id_pdv"          SERIAL        NOT NULL,
    "tenant_id"       INTEGER       NOT NULL,
    "nom"             TEXT          NOT NULL,
    "quartier"        TEXT,
    "ville"           TEXT,
    "adresse"         TEXT,
    "telephone"       TEXT,
    "email"           TEXT,
    "responsable_id"  INTEGER,
    "statut"          TEXT          NOT NULL DEFAULT 'actif',
    "date_ouverture"  TIMESTAMP(3),
    "date_fermeture"  TIMESTAMP(3),
    "created_at"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "point_de_vente_pkey" PRIMARY KEY ("id_pdv")
);

-- ==================== LIVRAISONS ====================

CREATE TABLE "livraison" (
    "id_livraison"    SERIAL        NOT NULL,
    "tenant_id"       INTEGER       NOT NULL,
    "id_collaborateur" INTEGER      NOT NULL,
    "id_pdv"          INTEGER       NOT NULL,
    "client_uuid"     TEXT,
    "date_livraison"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference"       TEXT,
    "commentaire"     TEXT,
    "created_at"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "livraison_pkey" PRIMARY KEY ("id_livraison")
);

CREATE TABLE "livraison_item" (
    "id_lot"               SERIAL        NOT NULL,
    "tenant_id"            INTEGER       NOT NULL,
    "id_produit"           INTEGER       NOT NULL,
    "id_livraison"         INTEGER       NOT NULL,
    "id_pdv"               INTEGER       NOT NULL,
    "prix_initial"         DECIMAL(10,2) NOT NULL,
    "marge"                DECIMAL(10,2) NOT NULL,
    "quantite_initiale"    DECIMAL(12,3) NOT NULL,
    "quantite_remboursee"  DECIMAL(12,3) NOT NULL DEFAULT 0,
    "id_lot_parent"        INTEGER,
    -- statut: en_stock | vendu | archive
    "statut"               TEXT          NOT NULL DEFAULT 'en_stock',
    "date_livraison"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"           INTEGER,
    "modified_by"          INTEGER,
    "deleted_at"           TIMESTAMP(3),
    "created_at"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "livraison_item_pkey" PRIMARY KEY ("id_lot")
);

-- ==================== COMMANDES ====================

CREATE TABLE "commande" (
    "id_commande"   SERIAL        NOT NULL,
    "id_client"     INTEGER       NOT NULL,
    "id_pdv"        INTEGER       NOT NULL,
    "cree_par_id"   INTEGER       NOT NULL,
    -- statut: reservee | confirmee | annulee
    "statut"        TEXT          NOT NULL DEFAULT 'reservee',
    "date_commande" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "commande_pkey" PRIMARY KEY ("id_commande")
);

CREATE TABLE "commande_ligne" (
    "id"                SERIAL         NOT NULL,
    "id_commande"       INTEGER        NOT NULL,
    "id_lot"            INTEGER        NOT NULL,
    "id_collaborateur"  INTEGER        NOT NULL,
    "quantite_reservee" DECIMAL(12,3)  NOT NULL,
    "prix_initial"      DECIMAL(10,2)  NOT NULL,
    "marge"             DECIMAL(10,2)  NOT NULL,
    "created_at"        TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "commande_ligne_pkey" PRIMARY KEY ("id")
);

-- ==================== CLIENTS ====================

CREATE TABLE "client" (
    "id_client"        SERIAL        NOT NULL,
    "tenant_id"        INTEGER       NOT NULL,
    "nom"              TEXT          NOT NULL,
    "prenom"           TEXT,
    "email"            TEXT,
    "telephone"        TEXT,
    "adresse"          TEXT,
    "date_inscription" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "client_pkey" PRIMARY KEY ("id_client")
);

-- ==================== VENTES ====================

CREATE TABLE "vente" (
    "id_vente"               SERIAL        NOT NULL,
    "tenant_id"              INTEGER       NOT NULL,
    "id_commande"            INTEGER,
    "id_client"              INTEGER       NOT NULL,
    "id_point_vente"         INTEGER       NOT NULL,
    "client_uuid"            TEXT,
    "date_vente"             TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enregistre_par_admin_id" INTEGER      NOT NULL,
    "id_utilisateur"         INTEGER,
    -- statut: en_attente_paiement | payee | annulee | retournee
    "statut"                 TEXT          NOT NULL DEFAULT 'payee',
    "montant_ht"             DECIMAL(15,2),
    "montant_tva"            DECIMAL(15,2) DEFAULT 0,
    "montant_marge"          DECIMAL(15,2),
    "montant_total"          DECIMAL(15,2),
    "deleted"                BOOLEAN       NOT NULL DEFAULT false,
    "deleted_at"             TIMESTAMP(3),
    "raison_suppression"     TEXT,
    "created_at"             TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vente_pkey" PRIMARY KEY ("id_vente")
);

CREATE TABLE "vente_article" (
    "id_ligne"            SERIAL         NOT NULL,
    "tenant_id"           INTEGER        NOT NULL,
    "id_vente"            INTEGER        NOT NULL,
    "id_lot"              INTEGER        NOT NULL,
    "id_collaborateur"    INTEGER        NOT NULL,
    "quantite_vendue"     DECIMAL(12,3)  NOT NULL,
    "prix_initial"        DECIMAL(10,2)  NOT NULL,
    "marge"               DECIMAL(10,2)  NOT NULL,
    "montant_ht"          DECIMAL(15,2),
    "montant_tva"         DECIMAL(15,2)  DEFAULT 0,
    "montant_marge"       DECIMAL(15,2),
    "deleted"             BOOLEAN        NOT NULL DEFAULT false,
    "deleted_at"          TIMESTAMP(3),
    "created_at"          TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Incrémenté à chaque annulation partielle ou totale de la ligne
    "quantite_retournee"  DECIMAL(12,3)  NOT NULL DEFAULT 0,
    -- Motif de la dernière annulation (non-faisant-foi ; source de vérité = stock_mouvement)
    "raison_suppression"  TEXT,
    CONSTRAINT "vente_article_pkey" PRIMARY KEY ("id_ligne")
);

-- ==================== ENCAISSEMENTS ====================

CREATE TABLE "encaissement" (
    "id_encaissement"   SERIAL        NOT NULL,
    "tenant_id"         INTEGER       NOT NULL,
    "id_vente"          INTEGER       NOT NULL,
    "montant"           DECIMAL(15,2) NOT NULL,
    -- mode: cash | mobile_money | carte | virement | autre
    "mode"              TEXT          NOT NULL DEFAULT 'cash',
    "reference"         TEXT,
    "date_encaissement" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cree_par_id"       INTEGER       NOT NULL,
    CONSTRAINT "encaissement_pkey" PRIMARY KEY ("id_encaissement")
);

-- ==================== FINANCE ====================

CREATE TABLE "transaction_financiere" (
    "id_transaction_financiere"  SERIAL        NOT NULL,
    "tenant_id"                  INTEGER       NOT NULL,
    -- type: IN | OUT
    "type"                       TEXT          NOT NULL,
    "montant"                    DECIMAL(15,2) NOT NULL,
    "date_transaction"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_categorie_financiere"    INTEGER       NOT NULL,
    "description"                TEXT,
    "source_module"              TEXT          NOT NULL,
    "source_id"                  INTEGER,
    "created_at"                 TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"                 INTEGER       NOT NULL,
    CONSTRAINT "transaction_financiere_pkey" PRIMARY KEY ("id_transaction_financiere")
);

CREATE TABLE "financial_category" (
    "id_category"  SERIAL        NOT NULL,
    "tenant_id"    INTEGER       NOT NULL,
    "name"         TEXT          NOT NULL,
    "type"         TEXT          NOT NULL,
    "actif"        BOOLEAN       NOT NULL DEFAULT true,
    "created_at"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "financial_category_pkey" PRIMARY KEY ("id_category")
);

-- ==================== ABONNEMENTS ====================
-- Architecture en 4 couches :
--   abonnement               → offre commerciale / catalogue
--       └── souscription_abonnement  → relation Collaborateur ↔ Offre (active, suspendue, terminée, annulée)
--               └── echeance_abonnement     → obligation financière d'une période
--                       └── paiement_abonnement → encaissement réel → TransactionFinanciere(IN)
--
-- Règles fondamentales :
--   abonnement.montant                = prix catalogue actuel (évolutif, ne rétroagit jamais)
--   souscription_abonnement.montant   = tarif applicable actuellement au collaborateur
--   echeance_abonnement.montant       = snapshot figé du montant dû à la génération
--   paiement_abonnement.montant       = encaissé réel, indépendant de l'échéance
--
-- Annulation : canceled_at / canceled_by — jamais de suppression physique.

CREATE TABLE "abonnement" (
    "id_abonnement"  SERIAL        NOT NULL,
    "tenant_id"      INTEGER       NOT NULL,
    "nom"            TEXT          NOT NULL,
    "description"    TEXT,
    -- Prix catalogue actuel — ne jamais utiliser pour reconstruire l'historique
    "montant"        DECIMAL(10,2) NOT NULL,
    -- mensuel | trimestriel | annuel | ponctuel
    "periodicite"    TEXT          NOT NULL,
    -- ACTIVE   = nouvelles souscriptions autorisées
    -- INACTIVE = souscriptions existantes continuent, pas de nouvelles
    -- ARCHIVED = offre conservée uniquement pour l'historique
    -- Désactiver une offre ne doit JAMAIS annuler les souscriptions existantes.
    -- Suppression physique interdite si au moins une souscription_abonnement existe.
    "statut"         TEXT          NOT NULL DEFAULT 'ACTIVE',
    "created_by"     INTEGER,
    "created_at"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_by"    INTEGER,
    "modified_at"    TIMESTAMP(3),
    CONSTRAINT "abonnement_pkey" PRIMARY KEY ("id_abonnement")
);

CREATE TABLE "souscription_abonnement" (
    "id_souscription_abonnement"  SERIAL        NOT NULL,
    "tenant_id"                   INTEGER       NOT NULL,
    "id_abonnement"               INTEGER       NOT NULL,
    "id_collaborateur"            INTEGER       NOT NULL,
    -- Tarif applicable actuellement à ce collaborateur (peut différer du catalogue)
    "montant"                     DECIMAL(10,2) NOT NULL,
    "renouvellement_auto"         BOOLEAN       NOT NULL DEFAULT true,
    "date_debut"                  TIMESTAMP(3)  NOT NULL,
    "date_fin"                    TIMESTAMP(3),
    -- ACTIVE | SUSPENDUE | TERMINEE | ANNULEE
    -- Migration commerciale = ancienne souscription date_fin + nouvelle souscription.
    -- Ne jamais réécrire id_abonnement ou montant sur une souscription existante.
    "statut"                      TEXT          NOT NULL DEFAULT 'ACTIVE',
    -- Renseigner pour annuler — ne jamais supprimer physiquement
    "canceled_at"                 TIMESTAMP(3),
    "canceled_by"                 INTEGER,
    "created_by"                  INTEGER,
    "created_at"                  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_by"                 INTEGER,
    "modified_at"                 TIMESTAMP(3),
    CONSTRAINT "souscription_abonnement_pkey" PRIMARY KEY ("id_souscription_abonnement")
);

CREATE TABLE "echeance_abonnement" (
    "id_echeance_abonnement"     SERIAL        NOT NULL,
    "tenant_id"                  INTEGER       NOT NULL,
    "id_souscription_abonnement" INTEGER       NOT NULL,
    -- Snapshot figé du montant dû — jamais recalculé après création
    "montant"                    DECIMAL(10,2) NOT NULL,
    "periode_debut"              TIMESTAMP(3)  NOT NULL,
    "periode_fin"                TIMESTAMP(3)  NOT NULL,
    -- en_attente | partiellement_payee | payee | annulee
    "statut"                     TEXT          NOT NULL DEFAULT 'en_attente',
    -- Renseigner pour annuler — ne jamais supprimer physiquement
    "canceled_at"                TIMESTAMP(3),
    "canceled_by"                INTEGER,
    "created_by"                 INTEGER,
    "created_at"                 TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_by"                INTEGER,
    "modified_at"                TIMESTAMP(3),
    CONSTRAINT "echeance_abonnement_pkey" PRIMARY KEY ("id_echeance_abonnement")
);

CREATE TABLE "paiement_abonnement" (
    "id_paiement_abonnement"    SERIAL        NOT NULL,
    "tenant_id"                 INTEGER       NOT NULL,
    "id_echeance_abonnement"    INTEGER       NOT NULL,
    -- Montant réellement encaissé — indépendant de echeance_abonnement.montant
    "montant"                   DECIMAL(10,2) NOT NULL,
    "date_paiement"             TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Groupe de paiement : plusieurs lignes partagent la même TransactionFinanciere
    -- NULL = paiement antérieur à cette évolution (rétrocompatibilité)
    "id_transaction_financiere" INTEGER,
    -- Renseigner pour annuler — ne jamais supprimer physiquement
    -- L'annulation se fait au niveau du groupe (id_transaction_financiere)
    "canceled_at"               TIMESTAMP(3),
    "canceled_by"               INTEGER,
    "created_by"                INTEGER,
    "created_at"                TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_by"               INTEGER,
    "modified_at"               TIMESTAMP(3),
    CONSTRAINT "paiement_abonnement_pkey" PRIMARY KEY ("id_paiement_abonnement")
);

-- ==================== LEGACY ====================
-- Préférer stock_mouvement directement

CREATE TABLE "stock_ajustement" (
    "id_stock_ajustement"  SERIAL        NOT NULL,
    "id_lot"               INTEGER       NOT NULL,
    "id_utilisateur"       INTEGER       NOT NULL,
    -- type: perte | casse | inventaire | correction
    "type"                 TEXT          NOT NULL,
    "quantite"             DECIMAL(12,3) NOT NULL,
    "motif"                TEXT,
    "date_ajustement"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- statut: brouillon | valide | annule
    "statut"               TEXT          NOT NULL DEFAULT 'valide',
    "created_at"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"           INTEGER,
    "updated_at"           TIMESTAMP(3),
    "updated_by"           INTEGER,
    "deleted_at"           TIMESTAMP(3),
    CONSTRAINT "stock_ajustement_pkey" PRIMARY KEY ("id_stock_ajustement")
);

CREATE TABLE "retour_collaborateur" (
    "id_retour_collaborateur"  SERIAL        NOT NULL,
    "id_lot"                   INTEGER       NOT NULL,
    "id_collaborateur"         INTEGER       NOT NULL,
    "id_utilisateur"           INTEGER       NOT NULL,
    "quantite_retournee"       DECIMAL(12,3) NOT NULL,
    "date_retour"              TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motif"                    TEXT,
    "created_at"               TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"               INTEGER,
    "updated_at"               TIMESTAMP(3),
    "updated_by"               INTEGER,
    "deleted_at"               TIMESTAMP(3),
    CONSTRAINT "retour_collaborateur_pkey" PRIMARY KEY ("id_retour_collaborateur")
);

-- ==================== INDEXES ====================

CREATE UNIQUE INDEX "utilisateur_email_key"                ON "utilisateur"("email");
CREATE UNIQUE INDEX "access_domain_code_key"               ON "access_domain"("code");
CREATE UNIQUE INDEX "role_code_key"                        ON "role"("code");
CREATE UNIQUE INDEX "stock_actuel_tenant_id_id_lot_id_pdv_key" ON "stock_actuel"("tenant_id","id_lot","id_pdv");
CREATE UNIQUE INDEX "unite_de_mesure_tenant_id_code_key"   ON "unite_de_mesure"("tenant_id","code");
CREATE UNIQUE INDEX "collaborateur_tenant_id_client_uuid_key" ON "collaborateur"("tenant_id","client_uuid");
CREATE UNIQUE INDEX "livraison_tenant_id_client_uuid_key"  ON "livraison"("tenant_id","client_uuid");
CREATE UNIQUE INDEX "vente_tenant_id_client_uuid_key"      ON "vente"("tenant_id","client_uuid");

CREATE INDEX "idx_souscription_abonnement_id_abonnement"    ON "souscription_abonnement"("id_abonnement");
CREATE INDEX "idx_souscription_abonnement_id_collaborateur"  ON "souscription_abonnement"("id_collaborateur");
CREATE INDEX "idx_souscription_abonnement_statut"            ON "souscription_abonnement"("statut");
CREATE INDEX "idx_souscription_abonnement_canceled"          ON "souscription_abonnement"("canceled_at") WHERE "canceled_at" IS NULL;
CREATE INDEX "idx_echeance_abonnement_id_souscription"       ON "echeance_abonnement"("id_souscription_abonnement");
CREATE INDEX "idx_echeance_abonnement_statut"                ON "echeance_abonnement"("statut");
CREATE INDEX "idx_echeance_abonnement_canceled"              ON "echeance_abonnement"("canceled_at") WHERE "canceled_at" IS NULL;
-- Idempotence du job de renouvellement : une même souscription ne peut avoir
-- qu'une seule échéance par date de début.
CREATE UNIQUE INDEX "uq_echeance_periode"
    ON "echeance_abonnement"("id_souscription_abonnement", "periode_debut");
CREATE INDEX "idx_paiement_abonnement_id_echeance"           ON "paiement_abonnement"("id_echeance_abonnement");
CREATE INDEX "idx_paiement_abonnement_id_tf"                 ON "paiement_abonnement"("id_transaction_financiere") WHERE "id_transaction_financiere" IS NOT NULL;
CREATE INDEX "idx_paiement_abonnement_canceled"              ON "paiement_abonnement"("canceled_at") WHERE "canceled_at" IS NULL;

-- ==================== FOREIGN KEYS ====================

ALTER TABLE "user_access_override"
    ADD CONSTRAINT "user_access_override_id_utilisateur_fkey"
    FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_access_override"
    ADD CONSTRAINT "user_access_override_id_domain_fkey"
    FOREIGN KEY ("id_domain") REFERENCES "access_domain"("id_domain") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "role_access_matrix"
    ADD CONSTRAINT "role_access_matrix_id_role_fkey"
    FOREIGN KEY ("id_role") REFERENCES "role"("id_role") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "role_access_matrix"
    ADD CONSTRAINT "role_access_matrix_id_domain_fkey"
    FOREIGN KEY ("id_domain") REFERENCES "access_domain"("id_domain") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "snapshot_ligne"
    ADD CONSTRAINT "snapshot_ligne_id_snapshot_fkey"
    FOREIGN KEY ("id_snapshot") REFERENCES "stock_snapshot"("id_snapshot") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "produit_catalogue"
    ADD CONSTRAINT "produit_catalogue_id_unite_fkey"
    FOREIGN KEY ("id_unite") REFERENCES "unite_de_mesure"("id_unite") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "livraison_item"
    ADD CONSTRAINT "livraison_item_id_livraison_fkey"
    FOREIGN KEY ("id_livraison") REFERENCES "livraison"("id_livraison") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commande_ligne"
    ADD CONSTRAINT "commande_ligne_id_commande_fkey"
    FOREIGN KEY ("id_commande") REFERENCES "commande"("id_commande") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vente_article"
    ADD CONSTRAINT "vente_article_id_vente_fkey"
    FOREIGN KEY ("id_vente") REFERENCES "vente"("id_vente") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "souscription_abonnement"
    ADD CONSTRAINT "souscription_abonnement_id_abonnement_fkey"
    FOREIGN KEY ("id_abonnement") REFERENCES "abonnement"("id_abonnement") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "echeance_abonnement"
    ADD CONSTRAINT "echeance_abonnement_id_souscription_abonnement_fkey"
    FOREIGN KEY ("id_souscription_abonnement") REFERENCES "souscription_abonnement"("id_souscription_abonnement") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "paiement_abonnement"
    ADD CONSTRAINT "paiement_abonnement_id_echeance_abonnement_fkey"
    FOREIGN KEY ("id_echeance_abonnement") REFERENCES "echeance_abonnement"("id_echeance_abonnement") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK souple vers transaction_financiere (nullable — pas de ON DELETE CASCADE pour préserver l'historique)
ALTER TABLE "paiement_abonnement"
    ADD CONSTRAINT "paiement_abonnement_id_transaction_financiere_fkey"
    FOREIGN KEY ("id_transaction_financiere") REFERENCES "transaction_financiere"("id_transaction_financiere") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================== GARDE-FOU CHEVAUCHEMENT SOUSCRIPTIONS ====================
-- Nécessite l'extension btree_gist pour les opérateurs de plages sur colonnes scalaires.
-- Règle V1 : un même collaborateur ne peut pas avoir deux souscriptions chevauchantes
-- pour la même offre. Les offres différentes peuvent se chevaucher librement.
-- Les souscriptions ANNULEE et TERMINEE sont exclues du périmètre de blocage.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "souscription_abonnement"
    ADD CONSTRAINT "no_overlap_souscription"
    EXCLUDE USING gist (
        id_collaborateur WITH =,
        id_abonnement    WITH =,
        tsrange(date_debut, COALESCE(date_fin, 'infinity'::timestamp), '[)') WITH &&
    )
    WHERE (canceled_at IS NULL AND statut NOT IN ('ANNULEE', 'TERMINEE'));

-- ==================== GARDE-FOU : QUANTITÉS ENTIÈRES ====================
-- Si un produit a une unité avec est_decimal = false (ex. "U" = Unité),
-- toute quantité non entière est rejetée immédiatement par la base de données.
-- Couverture : livraison_item, vente_article, stock_ajustement
-- ========================================================================

CREATE OR REPLACE FUNCTION check_quantite_entiere()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_est_decimal BOOLEAN;
  v_unite_code  TEXT;
  v_quantite    NUMERIC;
BEGIN
  -- Résoudre id_produit et quantité selon la table source
  IF TG_TABLE_NAME = 'livraison_item' THEN
    v_quantite := NEW.quantite_initiale;
    SELECT u.est_decimal, u.code
      INTO v_est_decimal, v_unite_code
      FROM produit_catalogue pc
      JOIN unite_de_mesure u ON u.id_unite = pc.id_unite
      WHERE pc.id_produit = NEW.id_produit;

  ELSIF TG_TABLE_NAME = 'vente_article' THEN
    v_quantite := NEW.quantite_vendue;
    SELECT u.est_decimal, u.code
      INTO v_est_decimal, v_unite_code
      FROM livraison_item li
      JOIN produit_catalogue pc ON pc.id_produit = li.id_produit
      JOIN unite_de_mesure u ON u.id_unite = pc.id_unite
      WHERE li.id_lot = NEW.id_lot
      LIMIT 1;

  ELSIF TG_TABLE_NAME = 'stock_ajustement' THEN
    v_quantite := NEW.quantite;
    SELECT u.est_decimal, u.code
      INTO v_est_decimal, v_unite_code
      FROM livraison_item li
      JOIN produit_catalogue pc ON pc.id_produit = li.id_produit
      JOIN unite_de_mesure u ON u.id_unite = pc.id_unite
      WHERE li.id_lot = NEW.id_lot
      LIMIT 1;
  END IF;

  -- Si l'unité n'est pas trouvée (produit sans id_unite), on laisse passer
  IF v_est_decimal IS NULL THEN
    RETURN NEW;
  END IF;

  -- Bloquer si l'unité est entière et la quantité a une partie décimale
  IF NOT v_est_decimal AND v_quantite <> FLOOR(v_quantite) THEN
    RAISE EXCEPTION
      'Quantité décimale (%) interdite pour une unité entière (%) sur la table %',
      v_quantite, v_unite_code, TG_TABLE_NAME
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_quantite_entiere_livraison
  BEFORE INSERT OR UPDATE ON livraison_item
  FOR EACH ROW EXECUTE FUNCTION check_quantite_entiere();

CREATE TRIGGER trg_check_quantite_entiere_vente
  BEFORE INSERT OR UPDATE ON vente_article
  FOR EACH ROW EXECUTE FUNCTION check_quantite_entiere();

CREATE TRIGGER trg_check_quantite_entiere_ajustement
  BEFORE INSERT OR UPDATE ON stock_ajustement
  FOR EACH ROW EXECUTE FUNCTION check_quantite_entiere();
