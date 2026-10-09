-- Les investisseurs deviennent des partenaires.
--
-- Trois rôles ont été arrêtés : lauréat, ministère, partenaire. Un fonds n'est donc plus un
-- type d'organisation mais un partenaire dont le MÉTIER est l'investissement. D'où une colonne
-- distincte : `type` dit dans quel espace on entre, `type_partenaire` dit ce qu'on fait.
--
-- L'ordre compte. Drizzle génère le recast avant la reprise des données, ce qui ferait échouer
-- la migration sur toute ligne encore marquée « investisseur » : la valeur n'existe plus dans
-- la nouvelle énumération. On migre donc les données PENDANT que la colonne est en `text`.

CREATE TYPE "public"."type_partenaire" AS ENUM('vc', 'private_equity', 'banque', 'industrie', 'institution', 'conseil', 'autre');--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "type_partenaire" "type_partenaire";--> statement-breakpoint

ALTER TABLE "organisations" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint

-- Reprise des données : « vc » par défaut, car les seules organisations concernées étaient
-- des fonds. Un autre métier se corrige ensuite depuis l'administration.
UPDATE "organisations" SET "type" = 'partenaire', "type_partenaire" = 'vc' WHERE "type" = 'investisseur';--> statement-breakpoint

DROP TYPE "public"."type_organisation";--> statement-breakpoint
CREATE TYPE "public"."type_organisation" AS ENUM('startup', 'pme', 'partenaire');--> statement-breakpoint
ALTER TABLE "organisations" ALTER COLUMN "type" SET DATA TYPE "public"."type_organisation" USING "type"::"public"."type_organisation";
