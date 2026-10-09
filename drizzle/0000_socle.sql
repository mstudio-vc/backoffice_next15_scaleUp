CREATE TYPE "public"."categorie_document" AS ENUM('presentation', 'business_plan', 'etats_financiers', 'statuts', 'autre');--> statement-breakpoint
CREATE TYPE "public"."categorie_offre" AS ENUM('cloud_infrastructure', 'juridique', 'comptabilite_fiscalite', 'banque_paiement', 'formation', 'recrutement', 'marketing_communication', 'logistique', 'autre');--> statement-breakpoint
CREATE TYPE "public"."cible_offre" AS ENUM('startups', 'pme', 'toutes');--> statement-breakpoint
CREATE TYPE "public"."initiateur_relation" AS ENUM('laureat', 'investisseur');--> statement-breakpoint
CREATE TYPE "public"."programme" AS ENUM('next15', 'scaleup');--> statement-breakpoint
CREATE TYPE "public"."role_utilisateur" AS ENUM('root', 'membre');--> statement-breakpoint
CREATE TYPE "public"."statut_demande" AS ENUM('envoyee', 'acceptee', 'refusee');--> statement-breakpoint
CREATE TYPE "public"."statut_offre" AS ENUM('publiee', 'retiree');--> statement-breakpoint
CREATE TYPE "public"."statut_organisation" AS ENUM('en_attente', 'validee', 'suspendue');--> statement-breakpoint
CREATE TYPE "public"."statut_utilisateur" AS ENUM('invite', 'actif', 'suspendu');--> statement-breakpoint
CREATE TYPE "public"."type_organisation" AS ENUM('startup', 'pme', 'partenaire', 'investisseur');--> statement-breakpoint
CREATE TYPE "public"."visibilite_document" AS ENUM('organisation', 'investisseurs', 'partenaires', 'tous');--> statement-breakpoint
CREATE TABLE "acces_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"jeton_hash" text NOT NULL,
	"expire_le" timestamp with time zone NOT NULL,
	"utilise_le" timestamp with time zone,
	"cree_par_id" uuid,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"programme" "programme" NOT NULL,
	"submission_id" text,
	"deposee_le" timestamp with time zone,
	"donnees" jsonb NOT NULL,
	"importee_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demandes_offres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offre_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"message" text,
	"statut" "statut_demande" DEFAULT 'envoyee' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"traitee_le" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"titre" text NOT NULL,
	"categorie" "categorie_document" DEFAULT 'autre' NOT NULL,
	"visibilite" "visibilite_document" DEFAULT 'organisation' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"libelle_source" text,
	"nom_fichier" text,
	"cle_stockage" text,
	"taille_octets" integer,
	"lien" text,
	"depose_par_id" uuid,
	"depose_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid,
	"organisation_id" uuid,
	"action" text NOT NULL,
	"cible" text,
	"details" jsonb,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mises_en_relation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"laureat_id" uuid NOT NULL,
	"investisseur_id" uuid NOT NULL,
	"initiateur" "initiateur_relation" NOT NULL,
	"message" text,
	"statut" "statut_demande" DEFAULT 'envoyee' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"traitee_le" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "offres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partenaire_id" uuid NOT NULL,
	"titre" text NOT NULL,
	"description" text NOT NULL,
	"categorie" "categorie_offre" DEFAULT 'autre' NOT NULL,
	"cible" "cible_offre" DEFAULT 'toutes' NOT NULL,
	"valide_jusqu_au" date,
	"statut" "statut_offre" DEFAULT 'publiee' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"mis_a_jour_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "type_organisation" NOT NULL,
	"denomination_sociale" text NOT NULL,
	"nom_commercial" text,
	"forme_juridique" text,
	"rccm" text,
	"ncc" text,
	"siege_social" text,
	"adresse_siege" text,
	"telephone" text,
	"email_officiel" text,
	"site_internet" text,
	"linkedin" text,
	"description" text,
	"localisation" text,
	"secteurs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"logo_url" text,
	"statut" "statut_organisation" DEFAULT 'en_attente' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"mis_a_jour_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"utilisateur_id" uuid NOT NULL,
	"jeton_hash" text NOT NULL,
	"expire_le" timestamp with time zone NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utilisateurs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nom" text,
	"role" "role_utilisateur" DEFAULT 'membre' NOT NULL,
	"organisation_id" uuid,
	"mot_de_passe_hash" text,
	"statut" "statut_utilisateur" DEFAULT 'invite' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"derniere_connexion_le" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "acces_invitations" ADD CONSTRAINT "acces_invitations_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acces_invitations" ADD CONSTRAINT "acces_invitations_cree_par_id_utilisateurs_id_fk" FOREIGN KEY ("cree_par_id") REFERENCES "public"."utilisateurs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demandes_offres" ADD CONSTRAINT "demandes_offres_offre_id_offres_id_fk" FOREIGN KEY ("offre_id") REFERENCES "public"."offres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demandes_offres" ADD CONSTRAINT "demandes_offres_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_depose_par_id_utilisateurs_id_fk" FOREIGN KEY ("depose_par_id") REFERENCES "public"."utilisateurs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal" ADD CONSTRAINT "journal_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal" ADD CONSTRAINT "journal_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mises_en_relation" ADD CONSTRAINT "mises_en_relation_laureat_id_organisations_id_fk" FOREIGN KEY ("laureat_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mises_en_relation" ADD CONSTRAINT "mises_en_relation_investisseur_id_organisations_id_fk" FOREIGN KEY ("investisseur_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offres" ADD CONSTRAINT "offres_partenaire_id_organisations_id_fk" FOREIGN KEY ("partenaire_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "acces_invitations_jeton_idx" ON "acces_invitations" USING btree ("jeton_hash");--> statement-breakpoint
CREATE INDEX "acces_invitations_utilisateur_idx" ON "acces_invitations" USING btree ("utilisateur_id");--> statement-breakpoint
CREATE INDEX "candidatures_organisation_idx" ON "candidatures" USING btree ("organisation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "candidatures_submission_idx" ON "candidatures" USING btree ("programme","submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "demandes_offres_unicite_idx" ON "demandes_offres" USING btree ("offre_id","organisation_id");--> statement-breakpoint
CREATE INDEX "demandes_offres_organisation_idx" ON "demandes_offres" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "documents_organisation_idx" ON "documents" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "journal_cree_le_idx" ON "journal" USING btree ("cree_le");--> statement-breakpoint
CREATE UNIQUE INDEX "mises_en_relation_unicite_idx" ON "mises_en_relation" USING btree ("laureat_id","investisseur_id");--> statement-breakpoint
CREATE INDEX "mises_en_relation_investisseur_idx" ON "mises_en_relation" USING btree ("investisseur_id");--> statement-breakpoint
CREATE INDEX "offres_partenaire_idx" ON "offres" USING btree ("partenaire_id");--> statement-breakpoint
CREATE INDEX "offres_statut_idx" ON "offres" USING btree ("statut");--> statement-breakpoint
CREATE INDEX "organisations_type_idx" ON "organisations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "organisations_statut_idx" ON "organisations" USING btree ("statut");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_jeton_idx" ON "sessions" USING btree ("jeton_hash");--> statement-breakpoint
CREATE INDEX "sessions_utilisateur_idx" ON "sessions" USING btree ("utilisateur_id");--> statement-breakpoint
CREATE UNIQUE INDEX "utilisateurs_email_idx" ON "utilisateurs" USING btree ("email");--> statement-breakpoint
CREATE INDEX "utilisateurs_organisation_idx" ON "utilisateurs" USING btree ("organisation_id");