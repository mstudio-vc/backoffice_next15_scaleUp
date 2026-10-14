import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { journal } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { CarteFormulaire, Retour } from "@/components/page-entete";
import { BOUTON, Libelle } from "@/components/champ";
import { appliquerImport, type EtatImport } from "./appliquer";

export default async function Import({
  searchParams,
}: {
  searchParams: Promise<{ fait?: string }>;
}) {
  await exigerRoot();
  const { fait } = await searchParams;

  async function importer(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    const { etat, journalId } = await appliquerImport(session.utilisateurId, formData);

    if (etat.ajoutes > 0) {
      revalidatePath("/admin/organisations");
      revalidatePath("/admin");
    }
    // Le compte rendu est relu depuis le journal : il résiste à un rechargement, et l'écran
    // n'a pas besoin de JavaScript pour l'afficher.
    redirect(`/admin/import?fait=${journalId}`);
  }

  // `fait` vient de l'URL : on ne lit que les entrées d'import, et uniquement celles qui
  // ressemblent à un identifiant, pour ne pas faire d'une adresse bricolée une requête.
  const trace =
    fait && /^[0-9a-f-]{36}$/.test(fait)
      ? await db.query.journal.findFirst({
          where: and(eq(journal.id, fait), eq(journal.action, "candidatures.importees")),
          columns: { details: true, cible: true },
        })
      : null;
  const etat = (trace?.details ?? null) as EtatImport | null;

  return (
    <>
      <Retour href="/admin/organisations" label="Organisations" />
      {/* Les entreprises importées arrivent en attente : elles n'apparaissent dans l'annuaire
          qu'une fois validées depuis /admin/organisations. */}
      <h1 className="mb-4 text-2xl font-bold text-encre">Importer des lauréats</h1>

      {etat ? (
        <div
          className={`mb-4 max-w-2xl rounded border-l-4 p-3 ${
            etat.ok ? "border-vert bg-feuille/5" : "border-orange bg-orange/5"
          }`}
        >
          <p className="font-bold text-encre">{etat.resume}</p>
          <p className="mt-0.5 text-xs text-pierre">{trace?.cible}</p>
          {etat.lignes.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1">
              {etat.lignes.map((l) => (
                <li key={l} className="font-mono text-base text-graphite">
                  {l}
                </li>
              ))}
            </ul>
          ) : null}
          {etat.ajoutes > 0 ? (
            <Link
              href="/admin/organisations"
              className="mt-3 inline-block text-sm font-bold text-vert hover:underline"
            >
              Voir les organisations à valider →
            </Link>
          ) : null}
        </div>
      ) : null}

      <CarteFormulaire>
        <form action={importer} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <Libelle obligatoire>Exports de candidature (.xlsx)</Libelle>
            <input
              type="file"
              name="fichiers"
              accept=".xlsx"
              multiple
              required
              className="w-full rounded border border-brume bg-white p-1.5 text-base file:mr-3 file:rounded file:border-0 file:bg-papier file:px-3 file:py-1 file:text-base file:text-graphite"
            />
            <span className="text-sm text-pierre">
              Les deux programmes ensemble. Réimporter ne crée pas de doublon.
            </span>
          </label>

          <div>
            <button className={BOUTON}>Importer</button>
          </div>
        </form>
      </CarteFormulaire>

    </>
  );
}
