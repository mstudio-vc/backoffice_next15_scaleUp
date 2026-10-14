import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { documents, journal } from "@/db/schema";
import { exigerSession } from "@/lib/garde";
import { deposer, TAILLE_MAX } from "@/lib/stockage";
import { Champ, BOUTON } from "@/components/champ";
import { CarteFormulaire, Retour } from "@/components/page-entete";
import { CATEGORIE_DOCUMENT, VISIBILITE_DOCUMENT } from "@/lib/vocabulaire";

export async function DepotDocument({ base }: { base: string }) {
  await exigerSession();

  async function ajouter(formData: FormData) {
    "use server";
    const session = await exigerSession();
    // On ne fait pas confiance à un champ caché : l'organisation vient de la session.
    if (!session.organisationId) return;

    const titre = String(formData.get("titre") ?? "").trim();
    const lien = String(formData.get("lien") ?? "").trim();
    const fichier = formData.get("fichier");
    if (!titre) return;

    // Un document est SOIT un fichier, SOIT un lien. Les deux à la fois n'aurait pas de sens
    // au moment de l'ouvrir.
    const aUnFichier = fichier instanceof File && fichier.size > 0;
    if (!aUnFichier && !lien) return;
    if (aUnFichier && fichier.size > TAILLE_MAX) return;

    // Redéposer sous le même titre crée une VERSION, sans rien écraser : une pièce remplacée
    // doit rester consultable.
    const memeTitre = await db.query.documents.findFirst({
      where: (d, { and, eq: e }) => and(e(d.organisationId, session.organisationId!), e(d.titre, titre)),
      orderBy: (d) => desc(d.version),
    });

    let cleStockage: string | null = null;
    let nomFichier: string | null = null;
    let tailleOctets: number | null = null;
    if (aUnFichier) {
      const depot = await deposer(session.organisationId, fichier.name, Buffer.from(await fichier.arrayBuffer()));
      cleStockage = depot.cle;
      nomFichier = depot.nom;
      tailleOctets = fichier.size;
    }

    await db.insert(documents).values({
      organisationId: session.organisationId,
      titre,
      categorie: formData.get("categorie") as keyof typeof CATEGORIE_DOCUMENT,
      visibilite: formData.get("visibilite") as keyof typeof VISIBILITE_DOCUMENT,
      version: memeTitre ? memeTitre.version + 1 : 1,
      nomFichier,
      cleStockage,
      tailleOctets,
      lien: aUnFichier ? null : lien,
      deposeParId: session.utilisateurId,
    });
    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      organisationId: session.organisationId,
      action: "document.depose",
      cible: titre,
    });
    redirect(base);
  }

  const champSelect =
    "h-8 rounded border border-brume bg-white px-3.5 text-base text-encre outline-none focus:border-vert focus:ring-4 focus:ring-brume";

  return (
    <>
      <Retour href={base} label="Documents" />
      <h1 className="mb-1 text-2xl font-bold text-encre">Déposer un document</h1>
      <p className="mb-6 max-w-2xl text-base text-ardoise">
        Un fichier de {TAILLE_MAX / 1024 / 1024} Mo au plus, ou un lien vers un document en
        ligne. Redéposer sous un titre déjà utilisé crée une nouvelle version : rien n&apos;est
        effacé.
      </p>

      <CarteFormulaire>
        <form action={ajouter} className="grid gap-5 sm:grid-cols-2">
          <Champ label="Titre" name="titre" required placeholder="États financiers 2025" />

          <label className="flex flex-col gap-1.5">
            <span className="text-base font-bold text-graphite">Catégorie</span>
            <select name="categorie" className={champSelect}>
              {Object.entries(CATEGORIE_DOCUMENT).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-base font-bold text-graphite">Fichier</span>
            <input
              type="file"
              name="fichier"
              className="rounded border border-brume bg-white p-2.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-papier file:px-3 file:py-1.5 file:text-sm file:font-normal file:text-graphite"
            />
            <span className="text-xs text-pierre">PDF, présentation, tableur, image.</span>
          </label>

          <div className="sm:col-span-2">
            <Champ
              label="…ou un lien"
              name="lien"
              type="url"
              placeholder="https://"
              aide="Utile pour un document tenu à jour en ligne."
            />
          </div>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-base font-bold text-graphite">Qui le voit</span>
            <select name="visibilite" className={champSelect}>
              {Object.entries(VISIBILITE_DOCUMENT).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <span className="text-xs text-pierre">
              Par défaut, votre organisation seule. Un document de candidature peut contenir des
              pièces sensibles.
            </span>
          </label>

          <div className="sm:col-span-2">
            <button className={BOUTON}>Déposer</button>
          </div>
        </form>
      </CarteFormulaire>
    </>
  );
}
