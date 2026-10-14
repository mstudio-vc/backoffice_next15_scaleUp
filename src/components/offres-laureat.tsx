import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { demandesOffres, journal, offres, organisations } from "@/db/schema";
import { exigerSession } from "@/lib/garde";
import { Pilule } from "@/components/badge";
import { Couverture } from "@/components/couverture";
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
    // Le partenaire doit être VALIDÉ. Sans cette condition, une organisation partenaire
    // enregistrée mais non encore validée par le Ministère poussait ses offres à tous les
    // lauréats — alors que son propre écran lui annonce l'inverse. La validation est la porte
    // d'entrée du marché : si elle ne ferme rien, elle ne veut rien dire.
    .where(
      and(
        eq(offres.statut, "publiee"),
        eq(organisations.statut, "validee"),
        inArray(offres.cible, [...ciblesVisibles]),
      ),
    )
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
      .innerJoin(organisations, eq(organisations.id, offres.partenaireId))
      .where(
        and(
          eq(offres.id, offreId),
          eq(offres.statut, "publiee"),
          eq(organisations.statut, "validee"),
        ),
      )
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
      <h1 className="text-xl font-bold">Offres des partenaires</h1>
      {lignes.map(({ offre, partenaire, demandeStatut }) => (
        <article key={offre.id} className="overflow-hidden rounded bg-white p-4 ring-1 ring-brume">
          <Couverture url={offre.couvertureUrl} cadre="-mx-4 -mt-4 mb-3" />
          <div className="flex flex-wrap items-center gap-2">
            <Pilule>
              {CATEGORIE_OFFRE[offre.categorie]}
            </Pilule>
            <Pilule>
              {CIBLE_OFFRE[offre.cible]}
            </Pilule>
            {offre.valideJusquAu ? (
              <span className="text-pierre">
                jusqu&apos;au {new Date(offre.valideJusquAu).toLocaleDateString("fr-FR")}
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 font-bold">{offre.titre}</h2>
          <p className="text-sm text-pierre">{partenaire}</p>
          <p className="mt-2 text-sm whitespace-pre-line text-graphite">{offre.description}</p>

          <div className="mt-4">
            {demandeStatut ? (
              <span className="inline-block rounded bg-papier px-3 py-1.5 text-sm font-normal text-ardoise">
                Demande {STATUT_DEMANDE[demandeStatut].toLowerCase()}
              </span>
            ) : (
              <form action={demander}>
                <input type="hidden" name="offreId" value={offre.id} />
                <button className="rounded bg-vert px-4 py-2 text-sm font-bold text-white hover:bg-vert-mid">
                  Demander cette offre
                </button>
              </form>
            )}
          </div>
        </article>
      ))}
      {lignes.length === 0 ? (
        <p className="rounded bg-white p-6 text-center text-pierre ring-1 ring-brume">
          Aucune offre publiée pour le moment.
        </p>
      ) : null}
    </div>
  );
}
