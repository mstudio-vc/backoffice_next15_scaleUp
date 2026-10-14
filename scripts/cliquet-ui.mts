/**
 * Le cliquet de l'interface.
 *
 *   npm run cliquet
 *
 * Il lit les sources et refuse une régression. Sans lui, les règles de ce dépôt seront
 * respectées par celui qui les a écrites, oubliées par le suivant, et contredites par le
 * troisième sans que personne ne s'en aperçoive.
 *
 * Deux familles de contrôle :
 *   · les interdits, qui ne doivent plus jamais apparaître ;
 *   · la dette de prose, qui ne peut que baisser — le budget est un plafond, pas un objectif.
 *
 * Chaque échec nomme le fichier ET dit quoi faire : un cliquet qui dit seulement « échec » se
 * fait désactiver.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SOURCES: string[] = [];
(function parcourir(d: string) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) parcourir(p);
    else if (p.endsWith(".tsx")) SOURCES.push(p);
  }
})("src");

type Interdit = {
  nom: string;
  motif: RegExp;
  quoiFaire: string;
  sauf?: (fichier: string) => boolean;
};

const INTERDITS: Interdit[] = [
  {
    nom: "rayon non conforme",
    motif: /\brounded-(?:sm|md|lg|xl|2xl|3xl)\b/g,
    quoiFaire: "SLDS impose 4 px : écrire `rounded`, sans suffixe.",
  },
  {
    nom: "badge fait à la main",
    motif: /\brounded-full\b/g,
    quoiFaire: "Utiliser <Badge> pour un statut, <Pilule> pour une catégorie.",
    sauf: (f) => f.endsWith("badge.tsx"),
  },
  {
    nom: "contrôle de 44 px",
    motif: /\bh-1[01]\b/g,
    quoiFaire: "Les contrôles font 32 px : `h-8`, ou les constantes de champ.tsx.",
  },
  {
    nom: "taille de texte en dur",
    motif: /text-\[\d+px\]/g,
    quoiFaire: "Utiliser l'échelle : text-xs (11), text-sm (12), text-base (13), text-lg…",
  },
  {
    nom: "troisième graisse",
    motif: /\bfont-(?:medium|semibold|extrabold|black)\b/g,
    quoiFaire: "Deux graisses seulement : normale, ou `font-bold`.",
  },
  {
    // Le halo de focus `focus:shadow-[0_0_3px_…]` EST la valeur SLDS (§7.3) : il est exclu.
    nom: "ombre portée de page d'accueil",
    motif: /(?<!focus:)\bshadow-(?:md|lg|xl|2xl|\[)/g,
    quoiFaire: "Une carte se borde (`ring-1 ring-brume`) ; le relief appartient aux menus.",
  },
];

/** Le texte affiché, hors attributs et hors accolades de code. */
const TEXTE = />\s*([^<>{}\n][^<>{}]{25,})\s*</g;

/**
 * Un `>` suivi d'un `<` ne délimite pas toujours du texte : `reduce<string | null>((a, n) =>`
 * en contient aussi. La première version de ce cliquet comptait donc du code comme de la
 * prose, et échouait à tort — un cliquet qui crie pour rien se fait désactiver.
 */
const TOKENS_DE_CODE = ["=>", ";", "//", "(", ")", "=", "&&", "??", "||", "[", "]"];

/**
 * Il ne mesure QUE le texte écrit dans le JSX. Une phrase construite en JavaScript — les
 * conséquences calculées d'une confirmation, par exemple — lui échappe : c'est une limite
 * connue, pas une tolérance. Compter tous les littéraux de chaîne noierait la mesure sous les
 * noms de classes.
 *
 * Les entités d'abord : `n&apos;apparaissent` contient un point-virgule, et une phrase
 * française sur deux porte une apostrophe. Sans ce décodage, le cliquet ne voyait presque
 * aucune prose et annonçait une dette deux fois plus faible qu'elle n'était.
 */
const decoder = (t: string) =>
  t
    .replace(/&apos;|&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");

const estDuCode = (t: string) => TOKENS_DE_CODE.some((k) => t.includes(k));

/**
 * Plafond de prose, en mots. Il descend, jamais l'inverse.
 *
 * 539 au 14 octobre 2026, avant la passe de simplification : l'écran se présentait au lieu
 * d'afficher son contenu. L'écran d'import à lui seul en portait 118.
 */
const BUDGET_PROSE = 189;

let echecs = 0;

for (const { nom, motif, quoiFaire, sauf } of INTERDITS) {
  const fautifs: string[] = [];
  for (const f of SOURCES) {
    if (sauf?.(f)) continue;
    const n = (readFileSync(f, "utf8").match(motif) ?? []).length;
    if (n > 0) fautifs.push(`${f} (${n})`);
  }
  if (fautifs.length > 0) {
    echecs += 1;
    console.error(`✗ ${nom}\n  ${quoiFaire}\n  ${fautifs.join("\n  ")}`);
  }
}

let mots = 0;
const parEcran: [string, number][] = [];
for (const f of SOURCES) {
  const s = readFileSync(f, "utf8");
  let n = 0;
  for (const m of s.matchAll(TEXTE)) {
    const phrase = decoder(m[1].replace(/\s+/g, " ").trim());
    const compte = phrase.split(" ").length;
    if (compte >= 5 && !phrase.startsWith("http") && !estDuCode(phrase)) n += compte;
  }
  if (n > 0) parEcran.push([f, n]);
  mots += n;
}

if (mots > BUDGET_PROSE) {
  echecs += 1;
  const pires = parEcran
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([f, n]) => `${f} (${n} mots)`);
  console.error(
    `✗ prose de l'interface : ${mots} mots pour un budget de ${BUDGET_PROSE}.\n` +
      `  Un écran de gestion annonce son contenu, il ne se présente pas. La raison d'une règle\n` +
      `  appartient au commentaire du code ; l'aide d'un champ tient en une ligne de 12 px.\n` +
      `  Les plus chargés : ${pires.join(", ")}`,
  );
} else {
  console.info(`prose : ${mots} mots (budget ${BUDGET_PROSE})`);
}

if (echecs > 0) {
  console.error(`\n${echecs} règle(s) d'interface enfreinte(s).`);
  process.exit(1);
}
console.info("cliquet d'interface : rien à signaler.");
