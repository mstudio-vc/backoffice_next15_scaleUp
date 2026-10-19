import Link from "next/link";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { demandesOffres, documents, offres, organisations } from "@/db/schema";
import { Badge } from "@/components/badge";

/**
 * Le tableau de bord d'un lauréat, startup ou entreprise.
 *
 * Il affichait sa fiche d'identité — c'est-à-dire ce que « Ma fiche » montre déjà, en mieux.
 * Un premier écran qui répète l'onglet suivant ne sert à rien.
 *
 * Il répond désormais à la seule question qu'on se pose en arrivant : OÙ EN SUIS-JE. Quatre
 * états, chacun avec ce qu'il reste à faire et le chemin pour le faire. Un suivi qui constate
 * sans donner la main suivante n'est qu'un bulletin.
 */
export async function TableauLaureat({
  organisationId,
  base,
}: {
  organisationId: string;
  /** Préfixe de l'espace, pour renvoyer vers SES écrans et non ceux de l'autre espace. */
  base: string;
}) {
  const org = await db.query.organisations.findFirst({
    where: eq(organisations.id, organisationId),
  });
  if (!org) return <p className="text-ardoise">Organisation introuvable.</p>;

  // Les champs que le lauréat peut lui-même compléter. Le RCCM n'en fait pas partie : il vient
  // de la candidature signée, et 138 lauréats sur 155 ne l'ont jamais renseigné — le compter
  // afficherait une fiche « incomplète » que personne ne peut compléter ici.
  const aRemplir: [string, string | null][] = [
    ["Nom commercial", org.nomCommercial],
    ["Localisation", org.localisation],
    ["Adresse du siège", org.adresseSiege],
    ["Téléphone", org.telephone],
    ["E-mail officiel", org.emailOfficiel],
    ["Site internet", org.siteInternet],
    ["Page LinkedIn", org.linkedin],
    ["Description", org.description],
    ["Secteurs", org.secteurs.length > 0 ? "oui" : null],
  ];
  const remplis = aRemplir.filter(([, v]) => v).length;
  const manquants = aRemplir.filter(([, v]) => !v).map(([k]) => k);

  const [[nbDocuments], [envoyees], [acceptees], [disponibles]] = await Promise.all([
    db.select({ n: count() }).from(documents).where(eq(documents.organisationId, organisationId)),
    db
      .select({ n: count() })
      .from(demandesOffres)
      .where(
        and(eq(demandesOffres.organisationId, organisationId), eq(demandesOffres.statut, "envoyee")),
      ),
    db
      .select({ n: count() })
      .from(demandesOffres)
      .where(
        and(
          eq(demandesOffres.organisationId, organisationId),
          eq(demandesOffres.statut, "acceptee"),
        ),
      ),
    // Les offres qu'il peut solliciter : publiées, d'un partenaire validé, et qui le ciblent.
    db
      .select({ n: count() })
      .from(offres)
      .innerJoin(organisations, eq(organisations.id, offres.partenaireId))
      .where(
        and(
          eq(offres.statut, "publiee"),
          eq(organisations.statut, "validee"),
          inArray(offres.cible, ["toutes", org.type === "startup" ? "startups" : "pme"]),
        ),
      ),
  ]);

  const etapes = [
    {
      titre: "Validation de votre dossier",
      etat:
        org.statut === "validee"
          ? { texte: "Validée", ton: "succes" as const }
          : org.statut === "suspendue"
            ? { texte: "Suspendue", ton: "erreur" as const }
            : { texte: "En attente", ton: "attente" as const },
      detail:
        org.statut === "validee"
          ? "Votre entreprise apparaît dans l'annuaire et peut solliciter les offres."
          : org.statut === "suspendue"
            ? "Contactez l'administration du programme."
            : "L'administration examine votre dossier. Rien à faire de votre côté.",
      lien: null,
    },
    {
      titre: "Votre fiche",
      etat: {
        texte: `${remplis}/${aRemplir.length}`,
        ton: remplis === aRemplir.length ? ("succes" as const) : ("attente" as const),
      },
      detail:
        manquants.length === 0
          ? "Tout est renseigné."
          : `Il manque : ${manquants.slice(0, 3).join(", ")}${
              manquants.length > 3 ? `, et ${manquants.length - 3} autre${manquants.length > 4 ? "s" : ""}` : ""
            }.`,
      lien: { href: `${base}/fiche`, label: "Compléter ma fiche" },
    },
    {
      titre: "Vos documents",
      etat: {
        texte: String(nbDocuments.n),
        ton: nbDocuments.n > 0 ? ("succes" as const) : ("attente" as const),
      },
      detail:
        nbDocuments.n === 0
          ? "Aucune pièce déposée. Présentation, business plan, états financiers."
          : `${nbDocuments.n} pièce${nbDocuments.n > 1 ? "s" : ""} au dossier.`,
      lien: { href: `${base}/documents/nouveau`, label: "Déposer un document" },
    },
    {
      titre: "Vos demandes d'offres",
      etat: {
        texte: `${acceptees.n} acceptée${acceptees.n > 1 ? "s" : ""}`,
        ton: acceptees.n > 0 ? ("succes" as const) : ("inactif" as const),
      },
      detail:
        envoyees.n > 0
          ? `${envoyees.n} demande${envoyees.n > 1 ? "s" : ""} en attente de réponse. ${disponibles.n} offre${disponibles.n > 1 ? "s" : ""} vous ${disponibles.n > 1 ? "sont" : "est"} ouverte${disponibles.n > 1 ? "s" : ""}.`
          : `${disponibles.n} offre${disponibles.n > 1 ? "s" : ""} vous ${disponibles.n > 1 ? "sont" : "est"} ouverte${disponibles.n > 1 ? "s" : ""}.`,
      lien: { href: `${base}/offres`, label: "Voir les offres" },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded bg-vert px-6 py-5 text-white">
        <h1 className="text-2xl font-bold">{org.denominationSociale}</h1>
        <p className="mt-1 text-sm text-white/75">
          {org.nomCommercial ? `${org.nomCommercial} · ` : ""}
          {org.type === "startup" ? "Ivoire Tech Next 15" : "Ivoire Tech Scale Up"}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {etapes.map((e) => (
          <section key={e.titre} className="flex flex-col rounded bg-white p-4 ring-1 ring-brume">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-bold text-encre">{e.titre}</h2>
              <Badge ton={e.etat.ton}>{e.etat.texte}</Badge>
            </div>
            <p className="mt-1 text-sm text-ardoise">{e.detail}</p>
            {e.lien ? (
              <Link
                href={e.lien.href}
                className="mt-3 text-base text-vert hover:underline"
              >
                {e.lien.label} →
              </Link>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
