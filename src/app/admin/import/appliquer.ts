import "server-only";
import { db } from "@/db/client";
import { journal } from "@/db/schema";
import { importerClasseur, type Resultat } from "@/lib/import-candidatures";
import { PROGRAMME } from "@/lib/vocabulaire";

/**
 * Le traitement d'un import, séparé de l'action qui l'appelle.
 *
 * Appelable comme une fonction ordinaire : c'est ce qui permet de l'éprouver sur un vrai
 * téléversement, une action de serveur ne pouvant pas être invoquée hors du contexte de requête
 * que Next lui réserve.
 *
 * Le compte rendu est écrit dans le journal, et c'est de là que l'écran le relit : il survit
 * donc à un rechargement, et l'on sait après coup qui a chargé quoi.
 */

/** 10 Mo : les exports connus pèsent 180 et 340 Ko, la marge est large. */
const TAILLE_MAX = 10 * 1024 * 1024;

export type EtatImport = {
  ok: boolean;
  resume: string;
  lignes: string[];
  /** Nombre de lauréats réellement ajoutés : l'appelant s'en sert pour invalider le cache. */
  ajoutes: number;
};

export async function appliquerImport(
  utilisateurId: string,
  formData: FormData,
): Promise<{ etat: EtatImport; journalId: string }> {
  const fichiers = formData
    .getAll("fichiers")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const lignes: string[] = [];
  let total = 0;
  let echec = false;

  for (const f of fichiers) {
    if (!/\.xlsx$/i.test(f.name)) {
      lignes.push(`✗ ${f.name} — seuls les fichiers .xlsx sont acceptés.`);
      echec = true;
      continue;
    }
    if (f.size > TAILLE_MAX) {
      lignes.push(`✗ ${f.name} — ${Math.round(f.size / 1024 / 1024)} Mo, au-delà de la limite.`);
      echec = true;
      continue;
    }

    let r: Resultat;
    try {
      // Le fichier reste en mémoire et n'est JAMAIS écrit sur le disque : un export de
      // candidature porte les coordonnées et les pièces de dirigeants.
      r = await importerClasseur(await f.arrayBuffer());
    } catch (e) {
      lignes.push(`✗ ${f.name} — ${e instanceof Error ? e.message : "fichier illisible"}`);
      echec = true;
      continue;
    }

    // Une ligne par feuille : un classeur peut porter les deux programmes, et fondre les
    // compteurs cacherait qu'une feuille n'a rien donné.
    for (const fe of r.feuilles) {
      total += fe.crees;
      lignes.push(
        `✓ ${PROGRAMME[fe.programme]} (${fe.feuille}) : ${fe.lus} lues, ${fe.crees} créées, ${fe.ignores} déjà présentes.`,
      );
    }
    for (const nom of r.ecartees) {
      lignes.push(`· feuille « ${nom} » écartée : ce n'est pas un tableau de candidatures.`);
    }

  }

  const etat: EtatImport = {
    ok: !echec && fichiers.length > 0,
    ajoutes: total,
    resume:
      fichiers.length === 0
        ? "Aucun fichier reçu."
        : total > 0
          ? `${total} lauréat${total > 1 ? "s" : ""} ajouté${total > 1 ? "s" : ""}, en attente de validation.`
          : echec
            ? "Aucun lauréat ajouté."
            : "Rien à ajouter : ces candidatures sont déjà en base.",
    lignes,
  };

  // Une seule entrée de journal par import, y compris quand il échoue : savoir qui a tenté de
  // charger quoi fait partie de la traçabilité, pas seulement les réussites.
  const [trace] = await db
    .insert(journal)
    .values({
      utilisateurId,
      action: "candidatures.importees",
      cible: fichiers.map((f) => f.name).join(", ") || "(aucun fichier)",
      details: etat,
    })
    .returning({ id: journal.id });

  return { etat, journalId: trace.id };
}
