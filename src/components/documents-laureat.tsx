import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documents, journal } from "@/db/schema";
import { exigerSession } from "@/lib/garde";
import { deposer, TAILLE_MAX } from "@/lib/stockage";
import { CATEGORIE_DOCUMENT, VISIBILITE_DOCUMENT } from "@/lib/vocabulaire";

function poids(octets: number | null): string {
  if (!octets) return "—";
  return octets < 1024 * 1024
    ? `${Math.round(octets / 1024)} Ko`
    : `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

export async function DocumentsLaureat({
  organisationId,
  base,
}: {
  organisationId: string;
  base: string;
}) {
  const lignes = await db
    .select()
    .from(documents)
    .where(eq(documents.organisationId, organisationId))
    .orderBy(desc(documents.deposeLe));

  async function ajouter(formData: FormData) {
    "use server";
    const session = await exigerSession();
    // On ne fait pas confiance au champ caché : l'organisation vient de la session.
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

    // Redéposer sous le même titre crée une VERSION, sans rien écraser : une pièce justificative
    // remplacée doit rester consultable.
    const memeTitre = await db.query.documents.findFirst({
      where: (d, { and, eq: e }) =>
        and(e(d.organisationId, session.organisationId!), e(d.titre, titre)),
      orderBy: (d, { desc: dd }) => dd(d.version),
    });
    const version = memeTitre ? memeTitre.version + 1 : 1;

    let cleStockage: string | null = null;
    let nomFichier: string | null = null;
    let tailleOctets: number | null = null;
    if (aUnFichier) {
      const depot = await deposer(
        session.organisationId,
        fichier.name,
        Buffer.from(await fichier.arrayBuffer()),
      );
      cleStockage = depot.cle;
      nomFichier = depot.nom;
      tailleOctets = fichier.size;
    }

    await db.insert(documents).values({
      organisationId: session.organisationId,
      titre,
      categorie: formData.get("categorie") as keyof typeof CATEGORIE_DOCUMENT,
      visibilite: formData.get("visibilite") as keyof typeof VISIBILITE_DOCUMENT,
      version,
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
      details: { version },
    });
    revalidatePath(base);
  }

  const champ = "h-11 rounded-lg border border-slate-300 px-3 font-normal";

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold">Déposer un document</h1>
        <p className="mt-1 text-sm text-slate-500">
          Un fichier (PDF, présentation, tableur, image, {TAILLE_MAX / 1024 / 1024} Mo au plus) ou
          un lien. Redéposer sous le même titre crée une nouvelle version, sans rien effacer.
        </p>
        <form action={ajouter} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Titre
            <input name="titre" required className={champ} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Catégorie
            <select name="categorie" className={champ}>
              {Object.entries(CATEGORIE_DOCUMENT).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Fichier
            <input type="file" name="fichier" className="rounded-lg border border-slate-300 p-2 font-normal" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            …ou un lien
            <input name="lien" type="url" placeholder="https://" className={champ} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Qui le voit
            <select name="visibilite" className={champ}>
              {Object.entries(VISIBILITE_DOCUMENT).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <div>
            <button className="h-11 rounded-lg bg-indigo-700 px-5 font-semibold text-white hover:bg-indigo-800">
              Déposer
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Mes documents</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="text-left text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="py-2 pr-4">Document</th>
                <th className="py-2 pr-4">Catégorie</th>
                <th className="py-2 pr-4">Version</th>
                <th className="py-2 pr-4">Déposé</th>
                <th className="py-2">Qui le voit</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="py-3 pr-4">
                    <span className="font-medium">{d.titre}</span>
                    <span className="block text-xs text-slate-500">
                      {d.lien ? (
                        <a href={d.lien} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline">
                          Ouvrir le lien
                        </a>
                      ) : (
                        <>
                          <a href={`/documents/${d.id}`} className="text-indigo-700 hover:underline">
                            Télécharger
                          </a>{" "}
                          · {poids(d.tailleOctets)}
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{CATEGORIE_DOCUMENT[d.categorie]}</td>
                  <td className="py-3 pr-4 text-slate-600">v{d.version}</td>
                  <td className="py-3 pr-4 text-slate-600">
                    {d.deposeLe.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-3 text-slate-600">{VISIBILITE_DOCUMENT[d.visibilite]}</td>
                </tr>
              ))}
              {lignes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Aucun document déposé.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
