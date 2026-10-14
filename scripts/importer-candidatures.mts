/**
 * Import des candidatures depuis la ligne de commande.
 *
 *   npm run importer:candidatures -- data/next15.xlsx data/scaleup.xlsx
 *
 * Ce script ne fait que lire des fichiers : toute la logique vit dans
 * `src/lib/import-candidatures.ts`, partagée avec l'écran d'administration. Deux copies
 * auraient divergé au premier export qui change un intitulé.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { readFile } from "node:fs/promises";
import { importerClasseur } from "@/lib/import-candidatures";

const fichiers = process.argv.slice(2);
if (fichiers.length === 0) {
  console.error("Usage : npm run importer:candidatures -- data/next15.xlsx data/scaleup.xlsx");
  process.exit(1);
}

for (const f of fichiers) {
  const r = await importerClasseur(await readFile(f));
  for (const fe of r.feuilles) {
    console.info(
      `${f} [${fe.feuille}] → ${fe.programme} : ${fe.lus} lignes lues, ${fe.crees} créées, ${fe.ignores} déjà présentes.`,
    );
  }
  for (const nom of r.ecartees) console.info(`${f} [${nom}] → écartée, pas un tableau de candidatures.`);
}
process.exit(0);
