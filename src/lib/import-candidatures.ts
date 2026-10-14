import "server-only";
import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { candidatures, organisations } from "@/db/schema";
import { typeDuProgramme } from "@/lib/vocabulaire";
import { COLONNE_SECTEURS, REPLIS, premier, secteursDe, type LigneCandidature } from "@/lib/jotform";

/**
 * L'import des candidatures Jotform.
 *
 * Une SEULE implémentation, partagée par le script en ligne de commande et l'écran
 * d'administration. Deux copies auraient divergé au premier export qui change un intitulé, et
 * personne n'aurait su laquelle fait foi.
 *
 * Elle travaille sur un tampon mémoire, pas sur un chemin : c'est ce qui permet à l'écran
 * d'importer un fichier téléversé sans jamais l'écrire sur le disque — un export de candidature
 * porte des données personnelles de dirigeants.
 *
 * Deux principes :
 *   · la ligne de candidature est conservée ENTIÈRE, en JSON, avec ses libellés d'origine ;
 *   · seules une dizaine de colonnes alimentent la fiche vivante.
 *
 * Idempotent : rejouer n'ajoute pas de doublon.
 */

export type Programme = "next15" | "scaleup";

export type ResultatFeuille = {
  feuille: string;
  programme: Programme;
  lus: number;
  crees: number;
  /** Déjà en base : l'import a été rejoué, ou la même candidature est dans deux fichiers. */
  ignores: number;
};

export type Resultat = {
  feuilles: ResultatFeuille[];
  /** Feuilles sans entête de candidature : feuille de garde, notes, brouillon. */
  ecartees: string[];
};

/** Le nombre de colonnes distingue les deux formulaires sans se fier au nom du fichier. */
function programmeDe(nbColonnes: number): Programme {
  return nbColonnes > 170 ? "scaleup" : "next15";
}

/** Les colonnes qui alimentent la fiche vivante. Tout le reste reste dans la candidature. */
const FICHE = {
  denominationSociale: "Dénomination sociale",
  nomCommercial: "Nom commercial / marque (si différent)",
  formeJuridique: "Forme juridique",
  rccm: "Numéro RCCM",
  ncc: "Numéro de compte contribuable (NCC)",
  adresseSiege: "Adresse complète du siège (commune, ville, région)",
  emailOfficiel: "Adresse e-mail officielle",
  siteInternet: "Site internet",
  linkedin: "Page LinkedIn de l'entreprise",
} as const;

function texte(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && v !== null && "text" in v) {
    return String((v as { text: unknown }).text).trim() || null;
  }
  const s = String(v).trim();
  return s || null;
}

/**
 * Toutes les feuilles traitées, une par programme.
 *
 * Un classeur par formulaire est le cas courant, mais les deux programmes peuvent être réunis
 * dans un seul classeur — c'est ce qui permet de ne manipuler qu'un fichier. Chaque feuille est
 * reconnue indépendamment : rien n'oblige à les ranger dans un ordre donné.
 */
async function importerFeuille(
  feuille: ExcelJS.Worksheet,
): Promise<ResultatFeuille | "ecartee"> {

  const entetes = (feuille.getRow(1).values as unknown[]).slice(1).map((v) => texte(v) ?? "");
  if (!entetes.includes(FICHE.denominationSociale)) return "ecartee";
  const programme = programmeDe(entetes.length);

  let lus = 0;
  let crees = 0;

  for (let i = 2; i <= feuille.rowCount; i += 1) {
    const cellules = (feuille.getRow(i).values as unknown[]).slice(1);
    const ligne: LigneCandidature = {};
    entetes.forEach((h, j) => {
      if (h) ligne[h] = texte(cellules[j]);
    });

    const denomination = ligne[FICHE.denominationSociale];
    if (!denomination) continue; // ligne vide en fin de feuille
    lus += 1;

    // Jotform ne fournit un `Submission ID` que sur le formulaire Scale Up. À défaut, la clé
    // est une empreinte de la LIGNE ENTIÈRE.
    //
    // Pourquoi pas dénomination + date : `Submission Date` n'a qu'une précision au jour, et
    // quatre entreprises ont déposé deux fois le même jour — une clé plus grossière les aurait
    // fondues en une seule, donc perdu des candidatures réelles.
    //
    // Contrepartie assumée : si un export ultérieur ajoute ou renomme une colonne, toutes les
    // empreintes changent et un réimport créerait des doublons.
    const submissionId =
      ligne["Submission ID"] ??
      createHash("sha256").update(JSON.stringify(ligne)).digest("hex").slice(0, 32);

    const dejaLa = await db
      .select({ id: candidatures.id })
      .from(candidatures)
      .where(and(eq(candidatures.programme, programme), eq(candidatures.submissionId, submissionId)))
      .limit(1);
    if (dejaLa.length > 0) continue;

    const depot = ligne["Submission Date"];
    const deposeeLe = depot ? new Date(depot) : null;

    await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organisations)
        .values({
          type: typeDuProgramme(programme),
          denominationSociale: denomination,
          nomCommercial: ligne[FICHE.nomCommercial],
          formeJuridique: ligne[FICHE.formeJuridique],
          rccm: ligne[FICHE.rccm],
          ncc: ligne[FICHE.ncc],
          siegeSocial: premier(ligne, REPLIS.siegeSocial),
          localisation: premier(ligne, REPLIS.localisation),
          adresseSiege: ligne[FICHE.adresseSiege],
          telephone: premier(ligne, REPLIS.telephone),
          emailOfficiel: ligne[FICHE.emailOfficiel],
          siteInternet: ligne[FICHE.siteInternet],
          linkedin: ligne[FICHE.linkedin],
          description: premier(ligne, REPLIS.description),
          secteurs: secteursDe(ligne[COLONNE_SECTEURS]),
        })
        .returning({ id: organisations.id });

      await tx.insert(candidatures).values({
        organisationId: org.id,
        programme,
        submissionId,
        deposeeLe: deposeeLe && !Number.isNaN(deposeeLe.getTime()) ? deposeeLe : null,
        donnees: ligne,
      });
    });
    crees += 1;
  }

  return { feuille: feuille.name, programme, lus, crees, ignores: lus - crees };
}

export async function importerClasseur(tampon: Buffer | ArrayBuffer): Promise<Resultat> {
  const classeur = new ExcelJS.Workbook();
  try {
    await classeur.xlsx.load(tampon as ArrayBuffer);
  } catch {
    // La bibliothèque parle de « central directory » et renvoie vers sa doc : illisible pour
    // l'administrateur qui vient de déposer un fichier dans l'écran d'import.
    throw new Error("Ce fichier n'est pas un classeur .xlsx lisible.");
  }

  const feuilles: ResultatFeuille[] = [];
  const ecartees: string[] = [];
  for (const f of classeur.worksheets) {
    if (f.rowCount <= 1) continue;
    const r = await importerFeuille(f);
    if (r === "ecartee") ecartees.push(f.name);
    else feuilles.push(r);
  }

  if (feuilles.length === 0) {
    throw new Error(
      `Ce fichier n'est pas un export de candidature : la colonne « ${FICHE.denominationSociale} » est absente.`,
    );
  }
  return { feuilles, ecartees };
}
