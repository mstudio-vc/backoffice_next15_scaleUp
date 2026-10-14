import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { journal } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { CarteFormulaire, Retour } from "@/components/page-entete";
import { BOUTON } from "@/components/champ";
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
      <h1 className="mb-1 text-2xl font-semibold text-encre">Importer des lauréats</h1>
      <p className="mb-6 max-w-2xl text-[15px] text-ardoise">
        Déposez les exports Jotform des deux programmes. Les entreprises arrivent en attente de
        validation : elles n&apos;apparaissent dans l&apos;annuaire qu&apos;une fois validées.
      </p>

      {etat ? (
        <div
          className={`mb-6 max-w-2xl rounded-xl border-l-4 p-4 ${
            etat.ok ? "border-vert bg-feuille/5" : "border-orange bg-orange/5"
          }`}
        >
          <p className="font-semibold text-encre">{etat.resume}</p>
          <p className="mt-0.5 text-xs text-pierre">{trace?.cible}</p>
          {etat.lignes.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1">
              {etat.lignes.map((l) => (
                <li key={l} className="font-mono text-[13px] text-graphite">
                  {l}
                </li>
              ))}
            </ul>
          ) : null}
          {etat.ajoutes > 0 ? (
            <Link
              href="/admin/organisations"
              className="mt-3 inline-block text-sm font-semibold text-vert hover:underline"
            >
              Voir les organisations à valider →
            </Link>
          ) : null}
        </div>
      ) : null}

      <CarteFormulaire>
        <form action={importer} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-graphite">
              Exports de candidature (.xlsx)
            </span>
            <input
              type="file"
              name="fichiers"
              accept=".xlsx"
              multiple
              required
              className="rounded-xl border border-brume bg-white p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-papier file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-graphite"
            />
            <span className="text-xs text-pierre">
              Les deux programmes peuvent être envoyés ensemble, dans un seul classeur à deux
              feuilles ou dans deux fichiers. Chaque feuille est reconnue au nombre de colonnes,
              pas au nom du fichier.
            </span>
          </label>

          <div>
            <button className={BOUTON}>Importer</button>
          </div>
        </form>
      </CarteFormulaire>

      <div className="mt-6 max-w-2xl rounded-xl border-l-4 border-vert/30 bg-white/60 p-4 text-sm text-graphite">
        <p className="font-semibold">Deux garanties</p>
        <p className="mt-1.5">
          <b>Rejouable.</b> Une candidature déjà en base est reconnue et ignorée. Réimporter le
          même fichier ne crée pas de doublon — vous pouvez recommencer sans crainte.
        </p>
        <p className="mt-1.5">
          <b>Le fichier n&apos;est pas conservé.</b> Il est lu en mémoire puis oublié. Un export
          de candidature porte les coordonnées et les pièces des dirigeants : il n&apos;a rien à
          faire sur le disque du serveur.
        </p>
      </div>
    </>
  );
}
