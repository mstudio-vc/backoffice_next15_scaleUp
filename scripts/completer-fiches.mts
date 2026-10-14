/**
 * Rattrapage des fiches déjà importées.
 *
 *   npm run completer:fiches            # montre ce qui serait rempli, n'écrit rien
 *   npm run completer:fiches -- --ecrire
 *
 * L'import des candidatures ne crée que ce qui manque : les lauréats déjà en base ne profitent
 * donc pas d'une correction de la correspondance Jotform. Ce script relit la candidature
 * conservée en base — d'où l'intérêt d'y avoir gardé la ligne entière — et complète la fiche.
 *
 * Ne remplit QUE les champs vides. La fiche est éditable par le lauréat : écraser une
 * description qu'il a réécrite pour y remettre le texte de son dossier de candidature serait
 * détruire son travail.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { candidatures, organisations } from "@/db/schema";
import {
  COLONNE_SECTEURS,
  REPLIS,
  premier,
  secteursDe,
  type LigneCandidature,
} from "@/lib/jotform";

const ecrire = process.argv.includes("--ecrire");

const lignes = await db
  .select({
    id: organisations.id,
    nom: organisations.denominationSociale,
    description: organisations.description,
    telephone: organisations.telephone,
    siegeSocial: organisations.siegeSocial,
    localisation: organisations.localisation,
    secteurs: organisations.secteurs,
    donnees: candidatures.donnees,
  })
  .from(candidatures)
  .innerJoin(organisations, eq(organisations.id, candidatures.organisationId));

const compte = { description: 0, telephone: 0, siegeSocial: 0, localisation: 0, secteurs: 0 };
let touchees = 0;

for (const l of lignes) {
  const d = (l.donnees ?? {}) as LigneCandidature;
  const maj: Record<string, unknown> = {};

  if (!l.description?.trim()) {
    const v = premier(d, REPLIS.description);
    if (v) {
      maj.description = v;
      compte.description += 1;
    }
  }
  if (!l.telephone?.trim()) {
    const v = premier(d, REPLIS.telephone);
    if (v) {
      maj.telephone = v;
      compte.telephone += 1;
    }
  }
  if (!l.siegeSocial?.trim()) {
    const v = premier(d, REPLIS.siegeSocial);
    if (v) {
      maj.siegeSocial = v;
      compte.siegeSocial += 1;
    }
  }
  if (!l.localisation?.trim()) {
    const v = premier(d, REPLIS.localisation);
    if (v) {
      maj.localisation = v;
      compte.localisation += 1;
    }
  }
  if ((l.secteurs ?? []).length === 0) {
    const v = secteursDe(d[COLONNE_SECTEURS] ?? null);
    if (v.length > 0) {
      maj.secteurs = v;
      compte.secteurs += 1;
    }
  }

  if (Object.keys(maj).length === 0) continue;
  touchees += 1;
  if (ecrire) {
    await db.update(organisations).set(maj).where(eq(organisations.id, l.id));
  }
}

console.info(`${lignes.length} fiches examinées, ${touchees} à compléter.`);
console.info(`  description : ${compte.description}`);
console.info(`  téléphone   : ${compte.telephone}`);
console.info(`  siège       : ${compte.siegeSocial}`);
console.info(`  localisation: ${compte.localisation}`);
console.info(`  secteurs    : ${compte.secteurs}`);
console.info(ecrire ? "\nÉcrit." : "\nEssai à blanc — relancer avec --ecrire pour appliquer.");

process.exit(0);
