/**
 * La correspondance entre les colonnes Jotform et les champs de la fiche.
 *
 * Partagée par l'import des candidatures et le rattrapage des fiches : les intitulés exacts des
 * deux formulaires ne doivent exister qu'à un seul endroit, sinon ils divergent au premier
 * export qui change un mot.
 */

/** Une ligne de candidature, telle qu'elle est conservée en base : libellé d'origine → valeur. */
export type LigneCandidature = Record<string, string | null>;

/**
 * Les deux formulaires ne rangent pas toujours la même information sous le même intitulé, et une
 * même donnée peut être éclatée sur plusieurs colonnes. On retient la première renseignée.
 *
 * Sans ces replis, la fiche arrive à moitié vide alors que la donnée est là : 10 téléphones sur
 * 104 pour Next 15, qui le saisit sous « Téléphone direct du CEO », et aucune description sur
 * 155 — chaque formulaire posant la question avec ses propres mots.
 */
export const REPLIS = {
  description: [
    "Décrivez votre activité",
    "Présentez vos produits et services : ce qu'ils font, ce qui les distingue de la concurrence, et les principales références déployées",
  ],
  telephone: [
    "Téléphone de l'entreprise",
    "Téléphone direct du CEO",
    "Téléphone direct du représentant légal",
    "Téléphone",
  ],
  siegeSocial: [
    "Localisation du siège social",
    "Adresse complète du siège (commune, ville, région)",
  ],
} as const;

export const COLONNE_SECTEURS =
  "Secteur(s) d'activité numérique sur lesquels l'entreprise se positionne";

/** La première colonne renseignée de la liste, ou null si aucune ne l'est. */
export function premier(ligne: LigneCandidature, cles: readonly string[]): string | null {
  for (const c of cles) {
    const v = ligne[c];
    if (v && String(v).trim()) return String(v).trim();
  }
  return null;
}

/**
 * Jotform sépare les cases cochées par un saut de ligne.
 *
 * Le tiret cadratin, lui, fait partie du libellé de l'option — « Data – IA – Cyber – Cloud » est
 * UN secteur, pas quatre. Découper dessus fabriquerait des étiquettes qui n'existent pas.
 */
export function secteursDe(valeur: string | null): string[] {
  if (!valeur) return [];
  return [...new Set(String(valeur).split("\n").map((s) => s.trim()).filter(Boolean))];
}
