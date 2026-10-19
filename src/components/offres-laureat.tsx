import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { demandesOffres, offres, organisations } from "@/db/schema";
import { Badge, Pilule } from "@/components/badge";
import { CarteTable, EntetePage, TD, TH, TR, Vide } from "@/components/page-entete";
import {
  CATEGORIE_OFFRE,
  CIBLE_OFFRE,
  STATUT_DEMANDE,
  TON_STATUT_DEMANDE,
  type TypeOrganisation,
} from "@/lib/vocabulaire";

/**
 * Les offres visibles par un lauréat, EN LISTE.
 *
 * Elles s'affichaient en grandes cartes, une par ligne, description entière dépliée. Un
 * partenaire qui publie trois offres — une voiture, une moto, une borne — occupait trois écrans
 * et l'on ne pouvait plus les comparer. Une liste tient le catalogue sous l'œil ; le détail
 * vit sur la fiche de l'offre, où il a la place de s'expliquer.
 *
 * Le filtrage par cible se fait EN SQL : une offre réservée aux PME ne doit pas atteindre une
 * startup, même masquée côté affichage.
 */
export async function OffresLaureat({
  organisationId,
  type,
  base,
  categorie,
}: {
  organisationId: string;
  type: TypeOrganisation;
  base: string;
  /** Filtre d'avantage, depuis l'URL. */
  categorie?: string;
}) {
  const ciblesVisibles =
    type === "startup" ? (["toutes", "startups"] as const) : (["toutes", "pme"] as const);

  const toutes = await db
    .select({
      offre: offres,
      partenaire: organisations.denominationSociale,
      demandeStatut: demandesOffres.statut,
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
    .orderBy(desc(offres.creeLe));

  const actif = categorie && categorie in CATEGORIE_OFFRE ? categorie : null;
  const lignes = actif ? toutes.filter((l) => l.offre.categorie === actif) : toutes;

  // Seuls les avantages réellement proposés : un filtre qui ne ramène rien est un piège.
  const avantages = (Object.keys(CATEGORIE_OFFRE) as (keyof typeof CATEGORIE_OFFRE)[])
    .map((c) => ({ cle: c, n: toutes.filter((l) => l.offre.categorie === c).length }))
    .filter((c) => c.n > 0);

  const demandees = toutes.filter((l) => l.demandeStatut).length;

  return (
    <>
      <EntetePage
        titre="Offres des partenaires"
        etat={`${toutes.length} offre${toutes.length > 1 ? "s" : ""} ouverte${
          toutes.length > 1 ? "s" : ""
        } · ${demandees} déjà sollicitée${demandees > 1 ? "s" : ""}`}
      />

      {avantages.length > 1 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Link
            href={base}
            className={`rounded px-2.5 py-1 text-base ${
              actif ? "text-ardoise hover:bg-papier" : "bg-vert font-bold text-white"
            }`}
          >
            Toutes <span className="ml-1.5 opacity-70">{toutes.length}</span>
          </Link>
          {avantages.map((a) => (
            <Link
              key={a.cle}
              href={`${base}?categorie=${a.cle}`}
              className={`rounded px-2.5 py-1 text-base ${
                actif === a.cle ? "bg-vert font-bold text-white" : "text-ardoise hover:bg-papier"
              }`}
            >
              {CATEGORIE_OFFRE[a.cle]} <span className="ml-1.5 opacity-70">{a.n}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {lignes.length === 0 ? (
        <Vide
          titre={actif ? "Aucune offre dans cet avantage" : "Aucune offre pour le moment"}
          texte={actif ? undefined : "Les offres de nos partenaires apparaîtront ici."}
          action={actif ? { href: base, label: "Voir toutes les offres" } : undefined}
        />
      ) : (
        <CarteTable>
          <thead>
            <tr>
              <th className={TH}>Offre</th>
              <th className={TH}>Avantage</th>
              <th className={TH}>Pour qui</th>
              <th className={TH}>Jusqu&apos;au</th>
              <th className={`${TH} text-right`}>Ma demande</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map(({ offre, partenaire, demandeStatut }) => (
              <tr key={offre.id} className={TR}>
                <td className={TD}>
                  {/* La ligne ouvre la fiche : on lit l'offre entière avant de la solliciter. */}
                  <Link href={`${base}/${offre.id}`} className="font-bold text-vert hover:underline">
                    {offre.titre}
                  </Link>
                  <span className="block text-sm text-pierre">{partenaire}</span>
                </td>
                <td className={TD}>
                  <Pilule>{CATEGORIE_OFFRE[offre.categorie]}</Pilule>
                </td>
                <td className={`${TD} text-sm text-ardoise`}>{CIBLE_OFFRE[offre.cible]}</td>
                <td className={`${TD} text-sm text-ardoise tabular-nums`}>
                  {offre.valideJusquAu
                    ? new Date(offre.valideJusquAu).toLocaleDateString("fr-FR")
                    : "—"}
                </td>
                <td className={`${TD} text-right`}>
                  {demandeStatut ? (
                    <Badge ton={TON_STATUT_DEMANDE[demandeStatut]}>
                      {STATUT_DEMANDE[demandeStatut]}
                    </Badge>
                  ) : (
                    <Link href={`${base}/${offre.id}`} className="text-base text-vert hover:underline">
                      Voir →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </CarteTable>
      )}
    </>
  );
}
