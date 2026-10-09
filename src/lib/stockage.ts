import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";

/**
 * Stockage des pièces jointes.
 *
 * Les fichiers vivent HORS de `public/` : un document de candidature contient des pièces
 * d'identité et des états financiers, il n'a rien à faire derrière une URL devinable. Toute
 * lecture passe par une route qui vérifie les droits.
 *
 * Implémentation volontairement simple — le disque local. En production, remplacer ce module
 * par un stockage objet : c'est le seul endroit à changer.
 */
const RACINE = process.env.STOCKAGE_DIR ?? ".stockage";

/** 20 Mo, comme la maquette l'annonce aux lauréats. */
export const TAILLE_MAX = 20 * 1024 * 1024;

function assainir(nom: string): string {
  return nom.replace(/[^\w.\-]+/g, "_").slice(-120) || "fichier";
}

/** Résout une clé en chemin, en refusant toute sortie de la racine (`../`). */
function cheminDe(cle: string): string {
  const chemin = normalize(join(RACINE, cle));
  const racine = normalize(RACINE) + sep;
  if (!chemin.startsWith(racine)) throw new Error("Clé de stockage invalide");
  return chemin;
}

export async function deposer(
  organisationId: string,
  nomFichier: string,
  contenu: Buffer,
): Promise<{ cle: string; nom: string }> {
  const nom = assainir(nomFichier);
  const cle = `${organisationId}/${randomUUID()}-${nom}`;
  const chemin = cheminDe(cle);
  await mkdir(dirname(chemin), { recursive: true });
  await writeFile(chemin, contenu);
  return { cle, nom };
}

export function lire(cle: string): Promise<Buffer> {
  return readFile(cheminDe(cle));
}
