/**
 * Migration de données : les lauréats, depuis les exports Jotform.
 *
 *   npm run importer:candidatures -- data/next15.xlsx data/scaleup.xlsx
 *
 * Deux principes :
 *   · la ligne de candidature est conservée ENTIÈRE, en JSON, avec ses libellés d'origine.
 *     153 et 192 colonnes dont beaucoup ne seront jamais affichées : les modéliser une par une
 *     coûterait cher et ferait perdre celles qu'on n'aurait pas prévues ;
 *   · seules une dizaine de colonnes alimentent la fiche vivante (`organisations`). Le reste
 *     reste consultable dans la candidature.
 *
 * Idempotent : rejouer l'import ne crée pas de doublon (index unique programme + soumission).
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { candidatures, organisations } from "@/db/schema";

type Programme = "next15" | "scaleup";

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
  siegeSocial: "Localisation du siège social",
  adresseSiege: "Adresse complète du siège (commune, ville, région)",
  telephone: "Téléphone de l'entreprise",
  emailOfficiel: "Adresse e-mail officielle",
  siteInternet: "Site internet",
  linkedin: "Page LinkedIn de l'entreprise",
} as const;

function texte(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && v !== null && "text" in v) return String((v as { text: unknown }).text).trim() || null;
  const s = String(v).trim();
  return s || null;
}

async function importer(chemin: string): Promise<{ programme: Programme; lus: number; crees: number }> {
  const classeur = new ExcelJS.Workbook();
  await classeur.xlsx.readFile(chemin);
  const feuille = classeur.worksheets[0];

  const entetes = (feuille.getRow(1).values as unknown[]).slice(1).map((v) => texte(v) ?? "");
  const programme = programmeDe(entetes.length);

  let lus = 0;
  let crees = 0;

  for (let i = 2; i <= feuille.rowCount; i += 1) {
    const cellules = (feuille.getRow(i).values as unknown[]).slice(1);
    const ligne: Record<string, string | null> = {};
    entetes.forEach((h, j) => {
      if (h) ligne[h] = texte(cellules[j]);
    });

    const denomination = ligne[FICHE.denominationSociale];
    if (!denomination) continue; // ligne vide en fin de feuille
    lus += 1;

    // Jotform ne fournit un `Submission ID` que sur le formulaire Scale Up. À défaut, une
    // empreinte de la dénomination et de la date de dépôt tient lieu de clé : stable d'un
    // export à l'autre, ce qui est tout ce qu'on demande à une clé d'idempotence.
    const submissionId =
      ligne["Submission ID"] ??
      createHash("sha256")
        .update(`${denomination}|${ligne["Submission Date"] ?? ""}`)
        .digest("hex")
        .slice(0, 32);

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
          programme,
          denominationSociale: denomination,
          nomCommercial: ligne[FICHE.nomCommercial],
          formeJuridique: ligne[FICHE.formeJuridique],
          rccm: ligne[FICHE.rccm],
          ncc: ligne[FICHE.ncc],
          siegeSocial: ligne[FICHE.siegeSocial],
          adresseSiege: ligne[FICHE.adresseSiege],
          telephone: ligne[FICHE.telephone],
          emailOfficiel: ligne[FICHE.emailOfficiel],
          siteInternet: ligne[FICHE.siteInternet],
          linkedin: ligne[FICHE.linkedin],
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

  return { programme, lus, crees };
}

const fichiers = process.argv.slice(2);
if (fichiers.length === 0) {
  console.error("Usage : npm run importer:candidatures -- data/next15.xlsx data/scaleup.xlsx");
  process.exit(1);
}

for (const f of fichiers) {
  const r = await importer(f);
  console.info(
    `${f} → ${r.programme} : ${r.lus} lignes lues, ${r.crees} créées, ${r.lus - r.crees} déjà présentes.`,
  );
}
process.exit(0);
