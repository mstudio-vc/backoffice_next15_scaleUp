import Link from "next/link";
import { and, count, countDistinct, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { demandesOffres, offres, organisations } from "@/db/schema";
import { exigerPartenaire } from "@/lib/garde";
import { Badge, Pilule } from "@/components/badge";
import { Anneau, Barres, Carte } from "@/components/graphiques";
import { TYPE_PARTENAIRE } from "@/lib/vocabulaire";

/**
 * Le tableau de bord d'un partenaire — le miroir de celui des lauréats.
 *
 * La racine de l'espace portait le formulaire de profil : un partenaire qui arrive y était mis
 * à remplir des champs, sans jamais savoir si ses offres servent à quelque chose. Le profil a
 * sa propre page ; ici on répond à « où en suis-je ».
 */
export default async function PartenaireTableauDeBord() {
  const s = await exigerPartenaire();

  const org = await db.query.organisations.findFirst({
    where: eq(organisations.id, s.organisationId!),
  });
  if (!org) return <p className="text-ardoise">Organisation introuvable.</p>;

  // Les champs que le partenaire peut lui-même renseigner. Le métier en fait partie : sans lui,
  // il n'apparaît dans aucune famille de l'annuaire.
  const aRemplir: [string, string | null][] = [
    ["Métier", org.typePartenaire],
    ["Localisation", org.localisation],
    ["Téléphone", org.telephone],
    ["E-mail officiel", org.emailOfficiel],
    ["Site internet", org.siteInternet],
    ["Description", org.description],
    ["Secteurs", org.secteurs.length > 0 ? "oui" : null],
  ];
  const remplis = aRemplir.filter(([, v]) => v).length;
  const manquants = aRemplir.filter(([, v]) => !v).map(([k]) => k);

  const [sesOffres, [laureatsVisibles]] = await Promise.all([
    db
      .select({
        id: offres.id,
        titre: offres.titre,
        statut: offres.statut,
        demandes: count(demandesOffres.id),
        acceptees: countDistinct(
          sql`case when ${demandesOffres.statut} = 'acceptee' then ${demandesOffres.organisationId} end`,
        ),
        enAttente: count(
          sql`case when ${demandesOffres.statut} = 'envoyee' then ${demandesOffres.id} end`,
        ),
        refusees: count(
          sql`case when ${demandesOffres.statut} = 'refusee' then ${demandesOffres.id} end`,
        ),
      })
      .from(offres)
      .leftJoin(demandesOffres, eq(demandesOffres.offreId, offres.id))
      .where(eq(offres.partenaireId, org.id))
      .groupBy(offres.id, offres.titre, offres.statut),

    // Le vivier qu'il peut solliciter : les lauréats validés, donc visibles dans son annuaire.
    db
      .select({ n: count() })
      .from(organisations)
      .where(
        and(
          eq(organisations.statut, "validee"),
          sql`${organisations.type} in ('startup','pme')`,
        ),
      ),
  ]);

  const acceptees = sesOffres.reduce((n, o) => n + Number(o.acceptees), 0);
  const enAttente = sesOffres.reduce((n, o) => n + Number(o.enAttente), 0);
  const refusees = sesOffres.reduce((n, o) => n + Number(o.refusees), 0);
  const publiees = sesOffres.filter((o) => o.statut === "publiee").length;

  const etapes = [
    {
      titre: "Validation de votre organisation",
      etat:
        org.statut === "validee"
          ? { texte: "Validée", ton: "succes" as const }
          : org.statut === "suspendue"
            ? { texte: "Suspendue", ton: "erreur" as const }
            : { texte: "En attente", ton: "attente" as const },
      detail:
        org.statut === "validee"
          ? "Vos offres sont visibles des lauréats et vous apparaissez dans l'annuaire."
          : "Tant que l'administration n'a pas validé, vos offres ne sont visibles de personne.",
      lien: null,
    },
    {
      titre: "Votre profil",
      etat: {
        texte: `${remplis}/${aRemplir.length}`,
        ton: remplis === aRemplir.length ? ("succes" as const) : ("attente" as const),
      },
      detail:
        manquants.length === 0
          ? "Tout est renseigné."
          : `Il manque : ${manquants.join(", ")}.`,
      lien: { href: "/partenaire/profil", label: "Compléter mon profil" },
    },
    {
      titre: "Vos offres",
      etat: {
        texte: String(publiees),
        ton: publiees > 0 ? ("succes" as const) : ("attente" as const),
      },
      detail:
        sesOffres.length === 0
          ? `Aucune offre. ${laureatsVisibles.n} lauréats pourraient la voir.`
          : `${publiees} publiée${publiees > 1 ? "s" : ""} sur ${sesOffres.length}, devant ${laureatsVisibles.n} lauréats validés.`,
      lien: { href: "/partenaire/offres/nouvelle", label: "Publier une offre" },
    },
    {
      titre: "Demandes à traiter",
      etat: {
        texte: String(enAttente),
        ton: enAttente > 0 ? ("alerte" as const) : ("inactif" as const),
      },
      detail:
        enAttente > 0
          ? "Des lauréats attendent votre réponse."
          : `${acceptees} lauréat${acceptees > 1 ? "s" : ""} accompagné${acceptees > 1 ? "s" : ""} à ce jour.`,
      lien: { href: "/partenaire/demandes", label: "Voir les demandes" },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded bg-vert px-6 py-5 text-white">
        <h1 className="text-2xl font-bold">{org.denominationSociale}</h1>
        <p className="mt-1 text-sm text-white/75">
          Partenaire
          {org.typePartenaire ? ` · ${TYPE_PARTENAIRE[org.typePartenaire]}` : ""}
          {org.localisation ? ` · ${org.localisation}` : ""}
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
              <Link href={e.lien.href} className="mt-3 text-base text-vert hover:underline">
                {e.lien.label} →
              </Link>
            ) : null}
          </section>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Carte titre="Vos offres" aide="Classées par nombre de sollicitations">
          {sesOffres.length === 0 ? (
            <p className="text-sm text-pierre">
              Aucune offre publiée.{" "}
              <Link href="/partenaire/offres/nouvelle" className="text-vert hover:underline">
                En publier une
              </Link>
              .
            </p>
          ) : (
            <Barres
              parts={sesOffres.map((o) => ({ label: o.titre, valeur: Number(o.demandes) }))}
              unite="demande"
              max={5}
            />
          )}
        </Carte>

        <Carte titre="Demandes reçues" aide="Sollicitations des lauréats">
          <Anneau
            parts={[
              { label: "Acceptées", valeur: acceptees },
              { label: "En attente", valeur: enAttente },
              { label: "Refusées", valeur: refusees },
            ]}
          />
        </Carte>

        <Carte titre="Vos secteurs d'intérêt" aide="Tels qu'ils apparaissent dans l'annuaire">
          {org.secteurs.length === 0 ? (
            <p className="text-sm text-pierre">
              Aucun secteur déclaré — vous n&apos;apparaîtrez dans aucun filtre.{" "}
              <Link href="/partenaire/profil" className="text-vert hover:underline">
                Les renseigner
              </Link>
              .
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {org.secteurs.map((s) => (
                <li key={s}>
                  <Pilule>{s}</Pilule>
                </li>
              ))}
            </ul>
          )}
        </Carte>
      </div>
    </div>
  );
}
