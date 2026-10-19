import Link from "next/link";
import { and, count, countDistinct, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { demandesOffres, offres, organisations, utilisateurs } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { CarteTable, TD, TH, TR, Vide } from "@/components/page-entete";
import { TYPE_PARTENAIRE } from "@/lib/vocabulaire";

/**
 * Le tableau de bord de l'administration.
 *
 * Il portait un « Par où commencer » qui affichait `npm run importer:candidatures` à des
 * utilisateurs qui n'ouvriront jamais un terminal. Une consigne technique dans une interface
 * est au mieux du bruit, au pire une impasse : la personne lit qu'il faut lancer une commande
 * et s'arrête là.
 *
 * À la place, chaque tuile EST le travail : elle compte ce qui attend et mène à l'écran où on
 * le traite. Un tableau de bord qui n'est pas cliquable ne sert qu'à regarder.
 *
 * S'y ajoute la question que le programme se pose vraiment : QUI TRAVAILLE AVEC QUI. Des
 * effectifs disent combien d'entreprises sont inscrites ; ils ne disent pas si le programme
 * produit des rencontres. C'est pourtant ce qu'on vient chercher — « Ecobank accompagne cinq
 * startups » est un résultat, « 161 organisations » n'en est pas un.
 */
export default async function AdminAccueil() {
  await exigerRoot();

  const [[aValider], [aActiver], [demandes], [startups], [pme], [partenaires], collaborations] =
    await Promise.all([
      db.select({ n: count() }).from(organisations).where(eq(organisations.statut, "en_attente")),
      db.select({ n: count() }).from(utilisateurs).where(eq(utilisateurs.statut, "invite")),
      db.select({ n: count() }).from(demandesOffres).where(eq(demandesOffres.statut, "envoyee")),
      db.select({ n: count() }).from(organisations).where(eq(organisations.type, "startup")),
      db.select({ n: count() }).from(organisations).where(eq(organisations.type, "pme")),
      db.select({ n: count() }).from(organisations).where(eq(organisations.type, "partenaire")),

      // Un partenaire « travaille avec » un lauréat dès qu'une demande les relie. On compte des
      // LAURÉATS DISTINCTS et non des demandes : trois sollicitations de la même startup font
      // une relation, pas trois. Le lien retenu est la demande acceptée ; les demandes encore
      // en attente sont comptées à part, car elles sont du travail, pas un résultat.
      db
        .select({
          id: organisations.id,
          nom: organisations.denominationSociale,
          metier: organisations.typePartenaire,
          offres: countDistinct(offres.id),
          laureats: countDistinct(
            sql`case when ${demandesOffres.statut} = 'acceptee' then ${demandesOffres.organisationId} end`,
          ),
          enAttente: countDistinct(
            sql`case when ${demandesOffres.statut} = 'envoyee' then ${demandesOffres.id} end`,
          ),
        })
        .from(organisations)
        .leftJoin(offres, eq(offres.partenaireId, organisations.id))
        .leftJoin(demandesOffres, eq(demandesOffres.offreId, offres.id))
        .where(and(eq(organisations.type, "partenaire"), eq(organisations.statut, "validee")))
        .groupBy(organisations.id, organisations.denominationSociale, organisations.typePartenaire)
        .orderBy(desc(countDistinct(
          sql`case when ${demandesOffres.statut} = 'acceptee' then ${demandesOffres.organisationId} end`,
        ))),
    ]);

  // Ce qui attend quelqu'un. L'ordre est celui de l'urgence, pas celui du modèle de données.
  const aFaire = [
    {
      label: "Organisations à valider",
      valeur: aValider.n,
      href: "/admin/organisations",
      teinte: "bg-orange",
    },
    {
      label: "Accès à activer",
      valeur: aActiver.n,
      href: "/admin/acces",
      teinte: "bg-menthe",
      aide: "Lien envoyé, mot de passe pas encore défini",
    },
    {
      label: "Demandes d'offres en attente",
      valeur: demandes.n,
      href: "/admin/offres/demandes",
      teinte: "bg-feuille",
    },
  ];

  const effectifs = [
    { label: "Startups Next 15", valeur: startups.n, href: "/admin/organisations?vue=next15" },
    { label: "Entreprises Scale Up", valeur: pme.n, href: "/admin/organisations?vue=scaleup" },
    { label: "Partenaires", valeur: partenaires.n, href: "/admin/organisations?vue=partenaires" },
  ];

  const relations = collaborations.reduce((n, c) => n + Number(c.laureats), 0);

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 sm:grid-cols-3">
        {aFaire.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="relative overflow-hidden rounded bg-white p-4 ring-1 ring-brume hover:ring-vert"
          >
            <span className={`absolute inset-y-0 left-0 w-1 ${t.teinte}`} />
            <p className="text-2xl font-bold text-encre tabular-nums">{t.valeur}</p>
            <p className="mt-0.5 text-base text-graphite">{t.label}</p>
            {t.aide ? <p className="text-sm text-pierre">{t.aide}</p> : null}
          </Link>
        ))}
      </section>

      <section className="flex flex-wrap gap-x-8 gap-y-2 rounded bg-white p-4 ring-1 ring-brume">
        {effectifs.map((e) => (
          <Link key={e.label} href={e.href} className="group">
            <p className="text-lg font-bold text-encre tabular-nums group-hover:text-vert">
              {e.valeur}
            </p>
            <p className="text-sm text-pierre group-hover:text-vert">{e.label}</p>
          </Link>
        ))}
        <Link
          href="/admin/annuaire"
          className="ml-auto self-center text-base text-vert hover:underline"
        >
          Parcourir l&apos;annuaire →
        </Link>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-encre">Collaborations</h2>
          <p className="text-sm text-pierre">
            {relations} relation{relations > 1 ? "s" : ""} nouée{relations > 1 ? "s" : ""} entre
            partenaires et lauréats
          </p>
        </div>

        {collaborations.length === 0 ? (
          <Vide
            titre="Aucun partenaire validé"
            texte="Les collaborations apparaîtront dès qu'un partenaire publiera une offre."
            action={{ href: "/admin/organisations/nouvelle", label: "Ajouter un partenaire" }}
          />
        ) : (
          <CarteTable>
            <thead>
              <tr>
                <th className={TH}>Partenaire</th>
                <th className={TH}>Métier</th>
                <th className={`${TH} text-right`}>Offres</th>
                <th className={`${TH} text-right`}>Lauréats accompagnés</th>
                <th className={`${TH} text-right`}>En attente</th>
              </tr>
            </thead>
            <tbody>
              {collaborations.map((c) => (
                <tr key={c.id} className={TR}>
                  <td className={TD}>
                    <Link
                      href={`/admin/organisations/${c.id}`}
                      className="font-bold text-vert hover:underline"
                    >
                      {c.nom}
                    </Link>
                  </td>
                  <td className={`${TD} text-ardoise`}>
                    {c.metier ? TYPE_PARTENAIRE[c.metier] : "—"}
                  </td>
                  <td className={`${TD} text-right tabular-nums text-ardoise`}>
                    {Number(c.offres)}
                  </td>
                  <td className={`${TD} text-right`}>
                    {/* La barre donne l'ordre de grandeur sans qu'on ait à comparer des chiffres
                        ligne à ligne. Sa largeur est relative au meilleur, pas absolue. */}
                    <span className="inline-flex items-center justify-end gap-2">
                      <span
                        aria-hidden
                        className="h-1.5 rounded-full bg-vert"
                        style={{
                          width: `${
                            Number(collaborations[0].laureats) > 0
                              ? (Number(c.laureats) / Number(collaborations[0].laureats)) * 72
                              : 0
                          }px`,
                        }}
                      />
                      <b className="tabular-nums text-encre">{Number(c.laureats)}</b>
                    </span>
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>
                    {Number(c.enAttente) > 0 ? (
                      <Link
                        href="/admin/offres/demandes"
                        className="text-orange-sombre hover:underline"
                      >
                        {Number(c.enAttente)}
                      </Link>
                    ) : (
                      <span className="text-pierre">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </CarteTable>
        )}
      </section>
    </div>
  );
}
