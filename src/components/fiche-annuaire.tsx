import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organisations } from "@/db/schema";
import { Badge, Pilule } from "@/components/badge";
import { BOUTON, BOUTON_CLAIR } from "@/components/champ";
import { Retour, Vide } from "@/components/page-entete";
import {
  STATUT_ORGANISATION,
  TON_STATUT_ORGANISATION,
  TYPE_ORGANISATION,
  TYPE_PARTENAIRE,
} from "@/lib/vocabulaire";

/**
 * La fiche d'une organisation dans l'annuaire, partagée par les quatre espaces.
 *
 * Elle existe parce que la description d'un lauréat fait 909 caractères en médiane : ce texte
 * a besoin d'un endroit à lui, et la carte de l'annuaire n'en montre que deux lignes.
 *
 * Le cloisonnement est fait EN SQL, pas à l'affichage : hors administration, la requête
 * n'accepte que les organisations validées. Un identifiant se devine, et une fiche en attente
 * n'a pas été contrôlée.
 */
export async function FicheAnnuaire({
  id,
  base,
  toutVoir = false,
}: {
  id: string;
  base: string;
  toutVoir?: boolean;
}) {
  const org = await db.query.organisations.findFirst({
    where: toutVoir
      ? eq(organisations.id, id)
      : and(eq(organisations.id, id), eq(organisations.statut, "validee")),
  });

  if (!org) {
    return (
      <>
        <Retour href={base} label="Annuaire" />
        <Vide
          titre="Cette fiche n'est pas accessible"
          texte="Elle n'existe pas, ou elle n'est pas encore validée."
          action={{ href: base, label: "Retour à l'annuaire" }}
        />
      </>
    );
  }

  const metier =
    org.type === "partenaire" && org.typePartenaire
      ? TYPE_PARTENAIRE[org.typePartenaire]
      : TYPE_ORGANISATION[org.type];

  const contacts = [
    org.siteInternet ? { label: "Site", valeur: org.siteInternet, lien: true } : null,
    org.linkedin ? { label: "LinkedIn", valeur: org.linkedin, lien: true } : null,
    org.emailOfficiel ? { label: "Courriel", valeur: org.emailOfficiel, lien: false } : null,
    org.telephone ? { label: "Téléphone", valeur: org.telephone, lien: false } : null,
  ].filter((c): c is { label: string; valeur: string; lien: boolean } => c !== null);

  return (
    <>
      <Retour href={base} label="Annuaire" />

      <header className="mb-3 flex flex-wrap items-start gap-3 rounded bg-white p-4 ring-1 ring-brume">
        <span className="grid size-12 shrink-0 place-items-center rounded bg-papier text-xl font-bold text-ardoise">
          {org.denominationSociale.trim()[0]?.toUpperCase() ?? "?"}
        </span>
        <div className="min-w-0 grow">
          <h1 className="text-2xl font-bold text-encre">{org.denominationSociale}</h1>
          <p className="text-base text-ardoise">
            {metier}
            {org.nomCommercial ? ` · ${org.nomCommercial}` : ""}
            {org.localisation ? ` · ${org.localisation}` : ""}
          </p>
        </div>
        {org.statut !== "validee" ? (
          <Badge ton={TON_STATUT_ORGANISATION[org.statut]}>
            {STATUT_ORGANISATION[org.statut]}
          </Badge>
        ) : null}
      </header>

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="rounded bg-white p-4 ring-1 ring-brume lg:col-span-2">
          <h2 className="mb-1 text-lg font-bold text-encre">Activité</h2>
          {org.description ? (
            <p className="text-base whitespace-pre-line text-graphite">{org.description}</p>
          ) : (
            <p className="text-base text-pierre">Pas encore renseignée.</p>
          )}

          {org.secteurs.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-brume pt-3">
              {org.secteurs.map((s) => (
                <li key={s}>
                  <Pilule>{s}</Pilule>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="rounded bg-white p-4 ring-1 ring-brume">
          {/* Entrer en relation est la raison d'être d'un annuaire. Les coordonnées venaient
              après la description, en lecture seule : il fallait sélectionner une adresse à la
              souris pour écrire. Les actions passent devant, et ouvrent le courrier. */}
          {org.emailOfficiel || org.siteInternet ? (
            <div className="mb-3 flex flex-wrap gap-2 border-b border-brume pb-3">
              {org.emailOfficiel ? (
                <a
                  href={`mailto:${org.emailOfficiel}?subject=${encodeURIComponent(
                    "Ivoire Tech — prise de contact",
                  )}`}
                  className={BOUTON}
                >
                  Écrire
                </a>
              ) : null}
              {org.siteInternet ? (
                <a
                  href={
                    org.siteInternet.startsWith("http")
                      ? org.siteInternet
                      : `https://${org.siteInternet}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className={BOUTON_CLAIR}
                >
                  Site internet
                </a>
              ) : null}
            </div>
          ) : null}

          <h2 className="mb-1 text-lg font-bold text-encre">Contact</h2>
          {contacts.length === 0 && !org.adresseSiege ? (
            <p className="text-base text-pierre">Aucune coordonnée publiée.</p>
          ) : (
            <dl>
              {contacts.map((c) => (
                <div key={c.label} className="border-b border-brume/60 py-1.5">
                  <dt className="text-sm text-pierre">{c.label}</dt>
                  <dd className="truncate text-base text-encre">
                    {c.lien ? (
                      <a
                        href={c.valeur.startsWith("http") ? c.valeur : `https://${c.valeur}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-vert hover:underline"
                      >
                        {c.valeur}
                      </a>
                    ) : (
                      c.valeur
                    )}
                  </dd>
                </div>
              ))}
              {org.adresseSiege ? (
                <div className="py-1.5">
                  <dt className="text-sm text-pierre">Adresse</dt>
                  <dd className="text-base text-encre">{org.adresseSiege}</dd>
                </div>
              ) : null}
            </dl>
          )}
        </section>
      </div>
    </>
  );
}
