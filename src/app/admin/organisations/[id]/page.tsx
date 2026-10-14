import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { candidatures, documents, journal, offres, organisations, utilisateurs } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { Badge } from "@/components/badge";
import { BOUTON, BOUTON_CLAIR, BOUTON_DANGER } from "@/components/champ";
import { CarteTable, Retour, TD, TH, TR, Vide } from "@/components/page-entete";
import {
  PROGRAMME,
  STATUT_ORGANISATION,
  STATUT_UTILISATEUR,
  TON_STATUT_ORGANISATION,
  TON_STATUT_UTILISATEUR,
  TYPE_ORGANISATION,
  TYPE_PARTENAIRE,
  programmeDe,
} from "@/lib/vocabulaire";

/**
 * La fiche d'une organisation.
 *
 * Elle n'existait pas : la liste portait les boutons d'action, et l'on validait 155 lauréats
 * sans pouvoir en regarder un seul. On décide alors sur une dénomination sociale, ce qui est
 * exactement ce que la règle 8 interdit — on lit une fiche, on agit ensuite.
 *
 * L'écriture, elle, n'a pas lieu ici : chaque action mène à sa page de confirmation.
 */

/** Un champ en lecture : libellé AU-DESSUS de la valeur, avec un filet (SLDS §5). */
function Donnee({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="border-b border-brume/60 py-1.5">
      <dt className="text-sm text-pierre">{label}</dt>
      <dd className="text-base text-encre">{children || <span className="text-pierre">—</span>}</dd>
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="rounded bg-white p-4 ring-1 ring-brume">
      <h2 className="mb-2 text-lg font-bold text-encre">{titre}</h2>
      {children}
    </section>
  );
}

export default async function FicheOrganisation({ params }: { params: Promise<{ id: string }> }) {
  await exigerRoot();
  const { id } = await params;

  const org = await db.query.organisations.findFirst({ where: eq(organisations.id, id) });

  // Ressource absente, et non route absente : les deux ne se disent pas pareil (règle 19).
  if (!org) {
    return (
      <>
        <Retour href="/admin/organisations" label="Organisations" />
        <Vide
          titre="Cette organisation n'existe plus"
          texte="Elle a été supprimée, ou l'adresse est incorrecte."
          action={{ href: "/admin/organisations", label: "Retour à la liste" }}
        />
      </>
    );
  }

  const [membres, docs, candidature, offresDuPartenaire, actions] = await Promise.all([
    db
      .select({
        id: utilisateurs.id,
        email: utilisateurs.email,
        nom: utilisateurs.nom,
        statut: utilisateurs.statut,
        derniereConnexionLe: utilisateurs.derniereConnexionLe,
      })
      .from(utilisateurs)
      .where(eq(utilisateurs.organisationId, id))
      .orderBy(utilisateurs.email),
    db
      .select({ id: documents.id, titre: documents.titre, deposeLe: documents.deposeLe })
      .from(documents)
      .where(eq(documents.organisationId, id))
      .orderBy(desc(documents.deposeLe)),
    db.query.candidatures.findFirst({ where: eq(candidatures.organisationId, id) }),
    org.type === "partenaire"
      ? db.select({ id: offres.id, titre: offres.titre, statut: offres.statut }).from(offres).where(eq(offres.partenaireId, id))
      : Promise.resolve([]),
    db
      .select({ action: journal.action, creeLe: journal.creeLe })
      .from(journal)
      .where(eq(journal.organisationId, id))
      .orderBy(desc(journal.creeLe))
      .limit(5),
  ]);

  const programme = programmeDe(org.type);
  const surtitre = [
    TYPE_ORGANISATION[org.type],
    org.typePartenaire ? TYPE_PARTENAIRE[org.typePartenaire] : null,
    programme ? PROGRAMME[programme] : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Retour href="/admin/organisations" label="Organisations" />

      <header className="mb-4 rounded bg-white p-4 ring-1 ring-brume">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-pierre">{surtitre}</p>
            <h1 className="text-2xl font-bold text-encre">{org.denominationSociale}</h1>
            {org.nomCommercial ? (
              <p className="text-base text-ardoise">{org.nomCommercial}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Badge ton={TON_STATUT_ORGANISATION[org.statut]}>
              {STATUT_ORGANISATION[org.statut]}
            </Badge>
            {/* Des LIENS, pas des boutons : rien ne s'écrit d'ici (règle 5). */}
            {org.statut === "en_attente" ? (
              <>
                <Link href={`/admin/organisations/${id}/statut?vers=validee`} className={BOUTON}>
                  Valider
                </Link>
                <Link
                  href={`/admin/organisations/${id}/statut?vers=suspendue`}
                  className={BOUTON_DANGER}
                >
                  Refuser
                </Link>
              </>
            ) : org.statut === "validee" ? (
              <Link
                href={`/admin/organisations/${id}/statut?vers=suspendue`}
                className={BOUTON_DANGER}
              >
                Suspendre
              </Link>
            ) : (
              <Link href={`/admin/organisations/${id}/statut?vers=validee`} className={BOUTON}>
                Réactiver
              </Link>
            )}
          </div>
        </div>

        {/* Les champs en évidence : ce qu'on vient chercher avant de décider (SLDS §5). */}
        <dl className="mt-3 grid gap-x-6 border-t border-brume pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <Donnee label="Localisation">{org.localisation ?? org.siegeSocial}</Donnee>
          <Donnee label="Forme juridique">{org.formeJuridique}</Donnee>
          <Donnee label="Comptes">
            {membres.length === 0
              ? null
              : `${membres.length} · ${membres.filter((m) => m.statut === "actif").length} actif${
                  membres.filter((m) => m.statut === "actif").length > 1 ? "s" : ""
                }`}
          </Donnee>
          <Donnee label="Documents">{docs.length}</Donnee>
        </dl>
      </header>

      <div className="flex flex-col gap-4">
        <Section titre="Fiche">
          <dl className="grid gap-x-6 sm:grid-cols-2">
            <Donnee label="Adresse du siège">{org.adresseSiege}</Donnee>
            <Donnee label="RCCM">{org.rccm}</Donnee>
            <Donnee label="Compte contribuable">{org.ncc}</Donnee>
            <Donnee label="Téléphone">{org.telephone}</Donnee>
            <Donnee label="Courriel">{org.emailOfficiel}</Donnee>
            <Donnee label="Site">{org.siteInternet}</Donnee>
            <Donnee label="LinkedIn">{org.linkedin}</Donnee>
            <Donnee label="Secteurs">{org.secteurs.join(", ")}</Donnee>
          </dl>
          {org.description ? (
            <p className="mt-3 text-base whitespace-pre-line text-graphite">{org.description}</p>
          ) : null}
        </Section>

        {candidature ? (
          <Section titre="Candidature">
            <dl className="grid gap-x-6 sm:grid-cols-3">
              <Donnee label="Programme">{PROGRAMME[candidature.programme]}</Donnee>
              <Donnee label="Déposée le">
                {candidature.deposeeLe?.toLocaleDateString("fr-FR")}
              </Donnee>
              <Donnee label="Importée le">
                {candidature.importeeLe.toLocaleDateString("fr-FR")}
              </Donnee>
            </dl>
          </Section>
        ) : null}

        <Section titre={`Comptes (${membres.length})`}>
          {membres.length === 0 ? (
            <p className="text-base text-pierre">
              Aucun compte.{" "}
              <Link href="/admin/acces/nouveau" className="text-vert hover:underline">
                Ouvrir un accès
              </Link>
            </p>
          ) : (
            <CarteTable>
              <thead>
                <tr>
                  <th className={TH}>Compte</th>
                  <th className={TH}>État</th>
                  <th className={TH}>Dernière connexion</th>
                </tr>
              </thead>
              <tbody>
                {membres.map((m) => (
                  <tr key={m.id} className={TR}>
                    <td className={TD}>
                      <span className="text-encre">{m.email}</span>
                      {m.nom ? <span className="block text-sm text-pierre">{m.nom}</span> : null}
                    </td>
                    <td className={TD}>
                      <Badge ton={TON_STATUT_UTILISATEUR[m.statut]}>
                        {STATUT_UTILISATEUR[m.statut]}
                      </Badge>
                    </td>
                    <td className={`${TD} text-ardoise`}>
                      {m.derniereConnexionLe?.toLocaleDateString("fr-FR") ?? "jamais"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </CarteTable>
          )}
        </Section>

        {org.type === "partenaire" ? (
          <Section titre={`Offres (${offresDuPartenaire.length})`}>
            {offresDuPartenaire.length === 0 ? (
              <p className="text-base text-pierre">Aucune offre.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {offresDuPartenaire.map((o) => (
                  <li key={o.id} className="flex items-center gap-2 text-base">
                    <Badge ton={o.statut === "publiee" ? "succes" : "inactif"}>
                      {o.statut === "publiee" ? "Publiée" : "Retirée"}
                    </Badge>
                    {o.titre}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        ) : null}

        {docs.length > 0 ? (
          <Section titre={`Documents (${docs.length})`}>
            <ul className="flex flex-col gap-1">
              {docs.slice(0, 5).map((d) => (
                <li key={d.id} className="flex justify-between gap-3 text-base">
                  <span className="text-encre">{d.titre}</span>
                  <span className="shrink-0 text-sm text-pierre">
                    {d.deposeLe.toLocaleDateString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {actions.length > 0 ? (
          <Section titre="Dernières actions">
            <ul className="flex flex-col gap-1">
              {actions.map((a, i) => (
                <li key={i} className="flex justify-between gap-3 text-base">
                  <span className="font-mono text-sm text-graphite">{a.action}</span>
                  <span className="shrink-0 text-sm text-pierre">
                    {a.creeLe.toLocaleString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/admin/journal"
              className={`${BOUTON_CLAIR} mt-3`}
            >
              Voir le journal
            </Link>
          </Section>
        ) : null}
      </div>
    </>
  );
}
