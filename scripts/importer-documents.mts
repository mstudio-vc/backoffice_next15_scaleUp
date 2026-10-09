/**
 * Reprise des pièces jointes des candidatures.
 *
 *   npm run importer:documents -- data/pieces            # ce qui serait fait, sans rien écrire
 *   npm run importer:documents -- data/pieces --ecrire   # pour de vrai
 *
 * Les exports Jotform ne contiennent PAS les fichiers : leurs colonnes de pièces portent une
 * URL `https://www.jotform.com/uploads/<compte>/<formulaire>/<soumission>/<fichier>`, et cette
 * URL exige d'être authentifié au compte propriétaire. Les fichiers doivent donc arriver
 * autrement — export groupé depuis Jotform, ou récupération par l'API.
 *
 * Ce script fait le lien entre ces fichiers, une fois sur disque, et les candidatures déjà
 * importées. Il ne télécharge rien.
 *
 * LE RATTACHEMENT. Chaque candidature conserve sa ligne entière en JSON, libellés d'origine
 * compris : les URL y sont donc toujours. On en extrait l'identifiant de soumission et le nom
 * du fichier, puis on cherche le fichier correspondant dans le dossier fourni. Le nom seul ne
 * suffirait pas — « RCCM.pdf » existe cent fois — d'où la priorité donnée au couple
 * soumission + nom.
 *
 * Idempotent : un document déjà repris sous le même titre pour la même organisation est ignoré.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { candidatures, documents, organisations } from "@/db/schema";
import { deposer } from "@/lib/stockage";
import type { CategorieDocument } from "@/lib/vocabulaire";

const dossier = process.argv[2];
const ecrire = process.argv.includes("--ecrire");

if (!dossier) {
  console.error("Usage : npm run importer:documents -- <dossier-des-pieces> [--ecrire]");
  process.exit(1);
}

/** Le libellé de la question dit à quelle catégorie la pièce appartient. */
function categorieDe(libelle: string): CategorieDocument {
  const l = libelle.toLowerCase();
  if (/états? financiers?|bilan|compte de résultat/.test(l)) return "etats_financiers";
  if (/business plan|plan d'affaires|projections/.test(l)) return "business_plan";
  if (/présentation|plaquette/.test(l)) return "presentation";
  if (/statuts|rccm|incorporation|registre|cap.?table|actionnaires/.test(l)) return "statuts";
  return "autre";
}

/** Index des fichiers présents sur disque : nom → chemins (plusieurs si le nom se répète). */
async function indexer(racine: string): Promise<Map<string, string[]>> {
  const index = new Map<string, string[]>();
  async function parcourir(d: string) {
    for (const entree of await readdir(d, { withFileTypes: true })) {
      const chemin = join(d, entree.name);
      if (entree.isDirectory()) await parcourir(chemin);
      else index.set(entree.name, [...(index.get(entree.name) ?? []), chemin]);
    }
  }
  await parcourir(racine);
  return index;
}

type Piece = { libelle: string; url: string; soumission: string; fichier: string };

/** Les pièces jointes d'une ligne de candidature, lues depuis son JSON. */
function piecesDe(donnees: Record<string, unknown>): Piece[] {
  const pieces: Piece[] = [];
  for (const [libelle, valeur] of Object.entries(donnees)) {
    if (typeof valeur !== "string") continue;
    // Une cellule peut porter plusieurs fichiers, séparés par des espaces.
    for (const brut of valeur.split(/\s+/)) {
      if (!/^https?:\/\/[^/]*jotform\.com\/uploads\//i.test(brut)) continue;
      const segments = new URL(brut).pathname.split("/").filter(Boolean);
      const fichier = decodeURIComponent(segments.at(-1) ?? "");
      const soumission = segments.at(-2) ?? "";
      if (fichier) pieces.push({ libelle, url: brut, soumission, fichier });
    }
  }
  return pieces;
}

const index = await indexer(dossier);
console.info(`${index.size} nom(s) de fichier distinct(s) dans ${dossier}\n`);

const lignes = await db
  .select({
    organisationId: candidatures.organisationId,
    donnees: candidatures.donnees,
    nom: organisations.denominationSociale,
  })
  .from(candidatures)
  .innerJoin(organisations, eq(organisations.id, candidatures.organisationId));

let attendus = 0;
let rattaches = 0;
let introuvables = 0;
let deja = 0;
const manquants: string[] = [];

for (const ligne of lignes) {
  for (const piece of piecesDe(ligne.donnees as Record<string, unknown>)) {
    attendus += 1;

    const candidats = index.get(piece.fichier) ?? [];
    // Plusieurs fichiers homonymes : on départage par l'identifiant de soumission, qui apparaît
    // dans l'arborescence d'un export groupé.
    const chemin =
      candidats.length === 1
        ? candidats[0]
        : candidats.find((c) => c.includes(piece.soumission)) ?? null;

    if (!chemin) {
      introuvables += 1;
      if (manquants.length < 10) manquants.push(`${ligne.nom} — ${piece.fichier}`);
      continue;
    }

    const existe = await db.query.documents.findFirst({
      where: (d, { and, eq: e }) =>
        and(e(d.organisationId, ligne.organisationId), e(d.titre, piece.libelle)),
    });
    if (existe) {
      deja += 1;
      continue;
    }

    if (ecrire) {
      const contenu = await readFile(chemin);
      const depot = await deposer(ligne.organisationId, basename(chemin), contenu);
      const taille = (await stat(chemin)).size;
      await db.insert(documents).values({
        organisationId: ligne.organisationId,
        titre: piece.libelle,
        // Le libellé d'origine est conservé tel quel : c'est la question à laquelle le lauréat
        // a répondu, et elle doit rester lisible même si la fiche évolue.
        libelleSource: piece.libelle,
        categorie: categorieDe(piece.libelle),
        // Le défaut le plus fermé : ces pièces portent des documents d'identité et des états
        // financiers. L'ouverture est une décision, jamais un effet de bord de l'import.
        visibilite: "organisation",
        nomFichier: depot.nom,
        cleStockage: depot.cle,
        tailleOctets: taille,
      });
    }
    rattaches += 1;
  }
}

console.info(`Pièces attendues d'après les candidatures : ${attendus}`);
console.info(`  rattachées  : ${rattaches}${ecrire ? "" : " (simulation)"}`);
console.info(`  déjà en base: ${deja}`);
console.info(`  introuvables: ${introuvables}`);
if (manquants.length > 0) {
  console.info(`\nExemples de fichiers introuvables :`);
  manquants.forEach((m) => console.info(`  · ${m}`));
}
if (!ecrire && rattaches > 0) {
  console.info(`\nRien n'a été écrit. Relancer avec --ecrire pour appliquer.`);
}
process.exit(0);
