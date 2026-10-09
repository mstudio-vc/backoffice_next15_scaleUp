import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { demandesOffres, journal, offres, organisations } from "@/db/schema";
import { exigerSession } from "@/lib/garde";
import {
  CATEGORIE_OFFRE,
  CIBLE_OFFRE,
  STATUT_DEMANDE,
  type TypeOrganisation,
} from "@/lib/vocabulaire";

/**
 * Les offres visibles par un lauréat.
 *
 * Le filtrage par cible se fait EN SQL : une offre réservée aux PME ne doit pas atteindre une
 * startup, même masquée côté affichage.
 */
export async function OffresLaureat({
  organisationId,
  type,
  base,
}: {
  organisationId: string;
  type: TypeOrganisation;
  base: string;
}) {
  const ciblesVisibles = type === "startup" ? (["toutes", "startups"] as const) : (["toutes", "pme"] as const);

  const lignes = await db
    .select({
      offre: offres,
      partenaire: organisations.denominationSociale,
      demandeStatut: demandesOffres.statut,
      demandeLe: demandesOffres.creeLe,
    })
    .from(offres)
    .innerJoin(organisations, eq(organisations.id, offres.partenaireId))
    .leftJoin(
      demandesOffres,
      and(eq(demandesOffres.offreId, offres.id), eq(demandesOffres.organisationId, organisationId)),
    )
    .where(and(eq(offres.statut, "publiee"), inArray(offres.cible, [...ciblesVisibles])))
    .orderBy(offres.creeLe);

  async function demander(formData: FormData) {
    "use server";
    const session = await exigerSession();
    if (!session.organisationId) return;
    const offreId = String(formData.get("offreId"));

    // L'offre doit être publiée ET viser ce lauréat : la vérification est refaite ici, car un
    // identifiant d'offre peut être forgé — l'affichage n'est pas une autorisation.
    const [o] = await db
      .select({ cible: offres.cible })
      .from(offres)
      .where(and(eq(offres.id, offreId), eq(offres.statut, "publiee")))
      .limit(1);
    if (!o || !([...ciblesVisibles] as string[]).includes(o.cible)) return;

    await db
      .insert(demandesOffres)
      .values({ offreId, organisationId: session.organisationId, statut: "envoyee" })
      .onConflictDoNothing();
    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      organisationId: session.organisationId,
      action: "offre.demandee",
      cible: offreId,
    });
    revalidatePath(base);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Offres des partenaires</h1>
      {lignes.map(({ offre, partenaire, demandeStatut }) => (
        <article key={offre.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-800">
              {CATEGORIE_OFFRE[offre.categorie]}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
              {CIBLE_OFFRE[offre.cible]}
            </span>
            {offre.valideJusquAu ? (
              <span className="text-slate-500">
                jusqu&apos;au {new Date(offre.valideJusquAu).toLocaleDateString("fr-FR")}
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 font-semibold">{offre.titre}</h2>
          <p className="text-sm text-slate-500">{partenaire}</p>
          <p className="mt-2 text-sm whitespace-pre-line text-slate-700">{offre.description}</p>

          <div className="mt-4">
            {demandeStatut ? (
              <span className="inline-block rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                Demande {STATUT_DEMANDE[demandeStatut].toLowerCase()}
              </span>
            ) : (
              <form action={demander}>
                <input type="hidden" name="offreId" value={offre.id} />
                <button className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800">
                  Demander cette offre
                </button>
              </form>
            )}
          </div>
        </article>
      ))}
      {lignes.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
          Aucune offre publiée pour le moment.
        </p>
      ) : null}
    </div>
  );
}
