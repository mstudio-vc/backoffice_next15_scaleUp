/**
 * Réunit les exports Jotform des deux programmes dans UN classeur importable.
 *
 *   npm run preparer:classeur -- data/next15.xlsx data/scaleup.xlsx
 *
 * Pourquoi ce script plutôt que de téléverser les deux exports : un seul fichier à manipuler,
 * aux feuilles nommées, et surtout des valeurs normalisées une fois pour toutes.
 *
 * LA CONTRAINTE QUI GOUVERNE TOUT : Jotform ne fournit un `Submission ID` que sur le formulaire
 * Scale Up. Pour Next 15, la clé anti-doublon est une empreinte de la ligne entière. Si ce
 * script altérait ne serait-ce qu'une cellule — un espace, un nombre reformaté — les empreintes
 * changeraient et un import créerait 104 doublons des lauréats déjà en base.
 *
 * Il relit donc son propre résultat et compare les 155 empreintes à celles des exports
 * d'origine. Une seule divergence et il refuse d'écrire.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { createHash } from "node:crypto";
import ExcelJS from "exceljs";

/** Identique à celle de l'import : c'est elle qui détermine les empreintes. */
function texte(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && v !== null && "text" in v) {
    return String((v as { text: unknown }).text).trim() || null;
  }
  const s = String(v).trim();
  return s || null;
}

type Tableau = { entetes: string[]; lignes: (string | null)[][] };

function lire(feuille: ExcelJS.Worksheet): Tableau {
  const entetes = (feuille.getRow(1).values as unknown[]).slice(1).map((v) => texte(v) ?? "");
  const lignes: (string | null)[][] = [];
  for (let i = 2; i <= feuille.rowCount; i += 1) {
    const cel = (feuille.getRow(i).values as unknown[]).slice(1);
    lignes.push(entetes.map((_, j) => texte(cel[j])));
  }
  return { entetes, lignes };
}

/** L'empreinte telle que l'import la calcule : sur l'objet libellé → valeur. */
function empreintes(t: Tableau): string[] {
  const out: string[] = [];
  for (const l of t.lignes) {
    const ligne: Record<string, string | null> = {};
    t.entetes.forEach((h, j) => {
      if (h) ligne[h] = l[j] ?? null;
    });
    const denom = ligne["Dénomination sociale"];
    if (!denom) continue;
    out.push(
      ligne["Submission ID"] ??
        createHash("sha256").update(JSON.stringify(ligne)).digest("hex").slice(0, 32),
    );
  }
  return out;
}

function feuilleUtile(c: ExcelJS.Workbook): ExcelJS.Worksheet {
  const f = c.worksheets.filter((x) => x.rowCount > 1);
  if (f.length === 0) throw new Error("aucune feuille de données");
  return f.reduce((a, b) => (b.rowCount > a.rowCount ? b : a));
}

const fichiers = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const sortie = "data/laureats-ivoire-tech.xlsx";
if (fichiers.length === 0) {
  console.error("Usage : npm run preparer:classeur -- data/next15.xlsx data/scaleup.xlsx");
  process.exit(1);
}

const sources: { nom: string; t: Tableau; emp: string[] }[] = [];
for (const f of fichiers) {
  const c = new ExcelJS.Workbook();
  await c.xlsx.readFile(f);
  const t = lire(feuilleUtile(c));
  const vides = t.entetes.filter((h) => !h).length;
  // Le programme est reconnu au nombre de colonnes : un entête vide décalerait la détection.
  const nom = t.entetes.length > 170 ? "Scale Up" : "Next 15";
  sources.push({ nom, t, emp: empreintes(t) });
  console.info(
    `${f} → feuille « ${nom} » : ${t.entetes.length} colonnes (${vides} entête(s) vide), ${t.lignes.length} lignes.`,
  );
}

const noms = new Set(sources.map((s) => s.nom));
if (noms.size !== sources.length) {
  console.error("Deux fichiers portent sur le même programme : le classeur aurait deux feuilles identiques.");
  process.exit(1);
}

const dest = new ExcelJS.Workbook();
for (const s of sources) {
  const f = dest.addWorksheet(s.nom);
  f.getRow(1).values = s.t.entetes;
  s.t.lignes.forEach((l, i) => {
    const r = f.getRow(i + 2);
    // On n'écrit que les cellules renseignées : une chaîne vide et une cellule absente ne sont
    // pas la même chose pour l'empreinte.
    l.forEach((v, j) => {
      if (v !== null) r.getCell(j + 1).value = v;
    });
    r.commit();
  });
}
await dest.xlsx.writeFile(sortie);

// --- Vérification : le classeur écrit doit redonner exactement les mêmes empreintes. ---
const relu = new ExcelJS.Workbook();
await relu.xlsx.readFile(sortie);
let ko = 0;
for (const s of sources) {
  const f = relu.getWorksheet(s.nom);
  if (!f) {
    console.error(`La feuille « ${s.nom} » est absente du classeur écrit.`);
    process.exit(1);
  }
  const t = lire(f);
  const emp = empreintes(t);
  const colonnes = t.entetes.length === s.t.entetes.length;
  const memeOrdre = emp.length === s.emp.length && emp.every((e, i) => e === s.emp[i]);
  console.info(
    `  « ${s.nom} » relue : ${t.entetes.length} colonnes ${colonnes ? "=" : "≠"} ${s.t.entetes.length}, ` +
      `${emp.length} empreintes ${memeOrdre ? "identiques" : "DIVERGENTES"}.`,
  );
  if (!colonnes || !memeOrdre) {
    ko += 1;
    emp.forEach((e, i) => {
      if (e !== s.emp[i]) console.error(`    ligne ${i + 2} : ${s.emp[i]} -> ${e}`);
    });
  }
}
if (ko > 0) {
  console.error("\nLe classeur altère les données : il créerait des doublons. Rien n'est livré.");
  process.exit(1);
}
console.info(`\n${sortie} — prêt à être importé.`);
process.exit(0);
