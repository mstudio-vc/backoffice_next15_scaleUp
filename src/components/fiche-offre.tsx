import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { demandesOffres, journal, offres, organisations } from "@/db/schema";
import { exigerSession } from "@/lib/garde";
import { Badge, Pilule } from "@/components/badge";
import { BOUTON } from "@/components/champ";
import { Couverture } from "@/components/couverture";
import { Retour } from "@/components/page-entete";
import {
  CATEGORIE_OFFRE,
  CIBLE_OFFRE,
  STATUT_DEMANDE,
  TON_STATUT_DEMANDE,
  TYPE_PARTENAIRE,
  type TypeOrganisation,
} from "@/lib/vocabulaire";

/**
 * La fiche d'une offre.
 *
 * La liste dit ce qui existe ; ici l'offre a la place de s'expliquer. Le bloc de droite n'est
 * pas un encart de contact : c'est le RÉSUMÉ qu'on relit avant de se décider — pour qui,
 * quel avantage, jusqu'à quand, et à qui écrire. Un contact seul ne dit pas s'il reste du
 * temps pour candidater.
 */
export async function FicheOffre({
  offreId,
  organisationId,
  type,
  base,
}: {
  offreId: string;
  organisationId: string;
  type: TypeOrganisation;
  /** Racine de la liste, pour le retour et la revalidation. */
  base: string;
}) {
  const ciblesVisibles =
    type === "startup" ? (["toutes", "startups"] as const) : (["toutes", "pme"] as const);

  const [ligne] = await db
    .select({
      offre: offres,
      partenaire: organisations.denominationSociale,
      metier: organisations.typePartenaire,
      contact: organisations.emailOfficiel,
      site: organisations.siteInternet,
      demandeStatut: demandesOffres.statut,
      demandeLe: demandesOffres.creeLe,
    })
    .from(offres)
    .innerJoin(organisations, eq(organisations.id, offres.partenaireId))
    .leftJoin(
      demandesOffres,
      and(eq(demandesOffres.offreId, offres.id), eq(demandesOffres.organisationId, organisationId)),
    )
    .where(
      and(
        eq(offres.id, offreId),
        eq(offres.statut, "publiee"),
        eq(organisations.statut, "validee"),
      ),
    )
    .limit(1);

  // Une offre qui ne vise pas ce lauréat n'existe pas pour lui : 404, et non « interdit ».
  // Répondre « interdit » confirmerait qu'elle existe.
  if (!ligne || !([...ciblesVisibles] as string[]).includes(ligne.offre.cible)) notFound();
  const { offre, partenaire, metier, contact, site, demandeStatut } = ligne;

  async function demander() {
    "use server";
    const session = await exigerSession();
    if (!session.organisationId) return;

    // La vérification est refaite ici : un identifiant d'offre peut être forgé, et l'affichage
    // n'est pas une autorisation.
    const [o] = await db
      .select({ cible: offres.cible })
      .from(offres)
      .innerJoin(organisations, eq(organisations.id, offres.partenaireId))
      .where(
        and(eq(offres.id, offreId), eq(offres.statut, "publiee"), eq(organisations.statut, "validee")),
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
    revalidatePath(`${base}/${offreId}`);
  }

  const resume: [string, React.ReactNode][] = [
    ["Avantage", CATEGORIE_OFFRE[offre.categorie]],
    ["Pour qui", CIBLE_OFFRE[offre.cible]],
    ["Partenaire", partenaire + (metier ? ` · ${TYPE_PARTENAIRE[metier]}` : "")],
    [
      "Contact",
      contact ? (
        <a href={`mailto:${contact}`} className="text-vert hover:underline">
          {contact}
        </a>
      ) : site ? (
        <a href={site} target="_blank" rel="noopener noreferrer" className="text-vert hover:underline">
          {site}
        </a>
      ) : (
        "—"
      ),
    ],
    ["Ajoutée le", offre.creeLe.toLocaleDateString("fr-FR")],
    [
      "Date limite",
      offre.valideJusquAu
        ? new Date(offre.valideJusquAu).toLocaleDateString("fr-FR")
        : "sans date limite",
    ],
  ];

  return (
    <>
      <Retour href={base} label="Toutes les offres" />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <article className="overflow-hidden rounded bg-white ring-1 ring-brume">
          <Couverture url={offre.couvertureUrl} cadre="" />
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Pilule>{CATEGORIE_OFFRE[offre.categorie]}</Pilule>
              <Pilule>{CIBLE_OFFRE[offre.cible]}</Pilule>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-encre">{offre.titre}</h1>
            <p className="text-base text-pierre">{partenaire}</p>
            <p className="mt-4 text-base leading-relaxed whitespace-pre-line text-graphite">
              {offre.description}
            </p>
          </div>
        </article>

        <aside className="flex h-fit flex-col gap-4 rounded bg-white p-5 ring-1 ring-brume">
          <h2 className="text-lg font-bold text-encre">Résumé de l&apos;offre</h2>
          <dl className="flex flex-col gap-3">
            {resume.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-bold tracking-wide text-pierre uppercase">{k}</dt>
                <dd className="mt-0.5 text-base text-encre">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-brume pt-4">
            {demandeStatut ? (
              <>
                <Badge ton={TON_STATUT_DEMANDE[demandeStatut]}>
                  Demande {STATUT_DEMANDE[demandeStatut].toLowerCase()}
                </Badge>
                <p className="mt-2 text-sm text-pierre">
                  {demandeStatut === "envoyee" ? "Réponse à venir." : "Contact direct possible."}
                </p>
              </>
            ) : (
              <form action={demander}>
                <button className={`${BOUTON} w-full`}>Demander cette offre</button>
              </form>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
