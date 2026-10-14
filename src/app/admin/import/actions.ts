"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { journal } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { importerClasseur, type Resultat } from "@/lib/import-candidatures";
import { PROGRAMME } from "@/lib/vocabulaire";

/** 10 Mo : les exports connus pèsent 180 et 340 Ko, la marge est large. */
const TAILLE_MAX = 10 * 1024 * 1024;

export type EtatImport = {
  ok: boolean;
  resume: string;
  lignes: string[];
} | null;

export async function lancerImport(_precedent: EtatImport, formData: FormData): Promise<EtatImport> {
  const session = await exigerRoot();

  const fichiers = formData
    .getAll("fichiers")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (fichiers.length === 0) {
    return { ok: false, resume: "Aucun fichier reçu.", lignes: [] };
  }

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

    total += r.crees;
    lignes.push(
      `✓ ${f.name} → ${PROGRAMME[r.programme]} : ${r.lus} lues, ${r.crees} créées, ${r.ignores} déjà présentes.`,
    );

    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      action: "candidatures.importees",
      cible: f.name,
      details: { programme: r.programme, lus: r.lus, crees: r.crees, ignores: r.ignores },
    });
  }

  if (total > 0) {
    revalidatePath("/admin/organisations");
    revalidatePath("/admin");
  }

  return {
    ok: !echec,
    resume:
      total > 0
        ? `${total} lauréat${total > 1 ? "s" : ""} ajouté${total > 1 ? "s" : ""}, en attente de validation.`
        : echec
          ? "Aucun lauréat ajouté."
          : "Rien à ajouter : ces candidatures sont déjà en base.",
    lignes,
  };
}
