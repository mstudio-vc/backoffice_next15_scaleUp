/**
 * Donner à lire une candidature.
 *
 * Une candidature compte 149 réponses pour Next 15, 192 pour Scale Up. Elles sont conservées
 * entières — c'est le choix d'origine, et il était juste — mais « Ma fiche » n'en montrait que
 * la date et le nombre. Le lauréat voyait donc « 149 réponses conservées » sans jamais pouvoir
 * en relire une seule, et l'administration devait ouvrir le classeur Excel pour les consulter.
 *
 * Rien n'est codé en dur ici : les deux formulaires ne partagent pas leurs intitulés, et les
 * recopier aurait produit un fichier de trois cents lignes qui serait faux au premier export
 * modifié. On s'appuie sur la FORME des clés, qui, elle, est stable :
 *
 *   · « Titre >> ligne >> colonne » est une grille Jotform — la moitié des réponses ;
 *   · une valeur qui commence par http est une pièce jointe ;
 *   · le reste est une réponse simple, parfois multi-lignes quand plusieurs cases sont cochées.
 *
 * Le regroupement par thème se fait par mots-clés, avec un fourre-tout. Mieux vaut une réponse
 * rangée au mauvais endroit que perdue.
 */

export type ChampCandidature = {
  libelle: string;
  /** Les cases cochées, une par ligne. Une seule entrée pour une réponse ordinaire. */
  valeurs: string[];
};

export type GrilleCandidature = {
  titre: string;
  /** Les en-têtes de colonne, dans leur ordre d'apparition. */
  colonnes: string[];
  lignes: { cle: string; cellules: Record<string, string> }[];
};

export type PieceCandidature = { libelle: string; urls: string[] };

export type SectionCandidature = {
  titre: string;
  champs: ChampCandidature[];
  grilles: GrilleCandidature[];
};

/**
 * Les colonnes déjà portées par la fiche vivante.
 *
 * Les répéter donnerait deux versions d'une même information sur le même écran — et comme la
 * fiche est modifiable, la seconde serait périmée dès la première correction.
 */
const DEJA_AFFICHE = [
  "dénomination sociale",
  "nom commercial / marque (si différent)",
  "forme juridique",
  "numéro rccm",
  "numéro de compte contribuable (ncc)",
  "adresse complète du siège (commune, ville, région)",
  "localisation du siège social",
  "téléphone de l'entreprise",
  "adresse e-mail officielle",
  "site internet",
  "page linkedin de l'entreprise",
  "décrivez votre activité",
  "présentez vos produits et services : ce qu'ils font, ce qui les distingue de la concurrence, et les principales références déployées",
  "secteur(s) d'activité numérique sur lesquels l'entreprise se positionne",
  "submission id",
  "submission date",
];

/** Les thèmes, dans l'ordre où on veut les lire. Le premier mot-clé trouvé l'emporte. */
const THEMES: { titre: string; cles: string[] }[] = [
  {
    titre: "Direction et équipe",
    // « Téléphone » et « E-mail » tout court désignent le contact du dossier, pas l'entreprise
    // — celle-ci a ses propres champs, exclus plus haut. Ils appartiennent donc aux personnes.
    cles: ["ceo", "fondateur", "dirigeant", "profils clés", "effectif", "genre", "nationalité", "fonction", "représentant légal", "référent", "téléphone", "e-mail", "linkedin", "parcours", "background"],
  },
  {
    titre: "Activité et marché",
    cles: ["client", "marché", "modèle économique", "innovant", "concurrence", "zones", "pays", "uemoa", "cedeao", "sous-région", "export", "partenariat"],
  },
  {
    titre: "Technologie et innovation",
    cles: ["intelligence artificielle", " ia ", "technologie", "hébergement", "données", "propriété intellectuelle", "certification", "homologation", "cœur technologique", "r&d", "brevet"],
  },
  {
    titre: "Chiffres et financement",
    cles: ["chiffre d'affaires", "fcfa", "levée", "levé", "financement", "investisseur", "rentabilité", "exercice", "bancaire", "trésorerie", "dette", "subvention"],
  },
  {
    titre: "Structure et gouvernance",
    cles: ["actionnariat", "gouvernance", "juridique", "capital", "statuts", "immatriculation", "fiscal", "conformité", "cnps", "social"],
  },
  {
    titre: "Programme et accompagnement",
    cles: ["motivation", "accompagnement", "incubateur", "programme", "attente", "besoin", "engage", "déclare"],
  },
];

const sansAccent = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * La liste d'exclusion, normalisée une fois.
 *
 * Elle était comparée telle quelle à des clés dont on avait retiré les accents : « décrivez
 * votre activité » ne pouvait jamais égaler « decrivez votre activite », et aucune ligne
 * n'était écartée. Les quatre champs de la fiche vivante se retrouvaient affichés deux fois
 * sur le même écran.
 */
const EXCLUS = new Set(DEJA_AFFICHE.map(sansAccent));

/** Les valeurs d'une grille arrivent à plat : on les remonte en lignes et colonnes. */
function rangerGrille(
  grilles: Map<string, GrilleCandidature>,
  titre: string,
  cle: string,
  colonne: string,
  valeur: string,
) {
  let g = grilles.get(titre);
  if (!g) {
    g = { titre, colonnes: [], lignes: [] };
    grilles.set(titre, g);
  }
  if (!g.colonnes.includes(colonne)) g.colonnes.push(colonne);
  let l = g.lignes.find((x) => x.cle === cle);
  if (!l) {
    l = { cle, cellules: {} };
    g.lignes.push(l);
  }
  l.cellules[colonne] = valeur;
}

export function lireCandidature(donnees: Record<string, unknown>): {
  sections: SectionCandidature[];
  pieces: PieceCandidature[];
  /** Nombre de réponses réellement renseignées — celui qu'on annonce. */
  renseignees: number;
} {
  const champsParTheme = new Map<string, ChampCandidature[]>();
  const grillesParTheme = new Map<string, Map<string, GrilleCandidature>>();
  const pieces: PieceCandidature[] = [];
  let renseignees = 0;

  const theme = (libelle: string) => {
    const l = sansAccent(libelle);
    return (
      THEMES.find((t) => t.cles.some((c) => l.includes(sansAccent(c))))?.titre ??
      "Autres réponses"
    );
  };

  for (const [cle, brut] of Object.entries(donnees)) {
    const valeur = String(brut ?? "").trim();
    if (!valeur) continue;
    if (EXCLUS.has(sansAccent(cle))) continue;
    renseignees += 1;

    const lignes = valeur.split("\n").map((v) => v.trim()).filter(Boolean);

    // Une pièce jointe : plusieurs fichiers peuvent avoir été déposés sur une même question.
    if (lignes.every((l) => /^https?:\/\//i.test(l))) {
      pieces.push({ libelle: cle, urls: lignes });
      continue;
    }

    const morceaux = cle.split(">>").map((m) => m.trim());
    if (morceaux.length >= 3) {
      const [titre, ligne, ...reste] = morceaux;
      const t = theme(titre);
      if (!grillesParTheme.has(t)) grillesParTheme.set(t, new Map());
      rangerGrille(grillesParTheme.get(t)!, titre, ligne, reste.join(" · "), valeur);
      continue;
    }

    const t = theme(cle);
    if (!champsParTheme.has(t)) champsParTheme.set(t, []);
    champsParTheme.get(t)!.push({ libelle: morceaux.join(" · "), valeurs: lignes });
  }

  const titres = [...THEMES.map((t) => t.titre), "Autres réponses"];
  const sections = titres
    .map((titre) => ({
      titre,
      champs: champsParTheme.get(titre) ?? [],
      grilles: [...(grillesParTheme.get(titre)?.values() ?? [])],
    }))
    .filter((s) => s.champs.length > 0 || s.grilles.length > 0);

  return { sections, pieces, renseignees };
}
