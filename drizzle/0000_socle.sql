CREATE TYPE "public"."programme" AS ENUM('next15', 'scaleup');--> statement-breakpoint
CREATE TYPE "public"."role_utilisateur" AS ENUM('root', 'membre');--> statement-breakpoint
CREATE TYPE "public"."statut_organisation" AS ENUM('en_attente', 'validee', 'suspendue');--> statement-breakpoint
CREATE TYPE "public"."statut_utilisateur" AS ENUM('invite', 'actif', 'suspendu');--> statement-breakpoint
CREATE TYPE "public"."type_document" AS ENUM('rccm', 'piece_identite', 'etats_financiers', 'cv_direction', 'organigramme', 'cap_table', 'statuts', 'attestation_fiscale', 'attestation_cnps', 'propriete_intellectuelle', 'certificat', 'autre');--> statement-breakpoint
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
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"type" "type_document" DEFAULT 'autre' NOT NULL,
	"libelle_source" text,
	"nom_fichier" text NOT NULL,
	"cle_stockage" text NOT NULL,
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
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"programme" "programme" NOT NULL,
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
ALTER TABLE "documents" ADD CONSTRAINT "documents_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_depose_par_id_utilisateurs_id_fk" FOREIGN KEY ("depose_par_id") REFERENCES "public"."utilisateurs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal" ADD CONSTRAINT "journal_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal" ADD CONSTRAINT "journal_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_utilisateur_id_utilisateurs_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."utilisateurs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "acces_invitations_jeton_idx" ON "acces_invitations" USING btree ("jeton_hash");--> statement-breakpoint
CREATE INDEX "acces_invitations_utilisateur_idx" ON "acces_invitations" USING btree ("utilisateur_id");--> statement-breakpoint
CREATE INDEX "candidatures_organisation_idx" ON "candidatures" USING btree ("organisation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "candidatures_submission_idx" ON "candidatures" USING btree ("programme","submission_id");--> statement-breakpoint
CREATE INDEX "documents_organisation_idx" ON "documents" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "journal_cree_le_idx" ON "journal" USING btree ("cree_le");--> statement-breakpoint
CREATE INDEX "organisations_programme_idx" ON "organisations" USING btree ("programme");--> statement-breakpoint
CREATE INDEX "organisations_statut_idx" ON "organisations" USING btree ("statut");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_jeton_idx" ON "sessions" USING btree ("jeton_hash");--> statement-breakpoint
CREATE INDEX "sessions_utilisateur_idx" ON "sessions" USING btree ("utilisateur_id");--> statement-breakpoint
CREATE UNIQUE INDEX "utilisateurs_email_idx" ON "utilisateurs" USING btree ("email");--> statement-breakpoint
CREATE INDEX "utilisateurs_organisation_idx" ON "utilisateurs" USING btree ("organisation_id");