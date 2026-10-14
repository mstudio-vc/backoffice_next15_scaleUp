import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { demandesOffres, organisations, utilisateurs } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";

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
 */
export default async function AdminAccueil() {
  await exigerRoot();

  const [[aValider], [aActiver], [demandes], [startups], [pme], [partenaires]] = await Promise.all([
    db
      .select({ n: count() })
      .from(organisations)
      .where(eq(organisations.statut, "en_attente")),
    db.select({ n: count() }).from(utilisateurs).where(eq(utilisateurs.statut, "invite")),
    db.select({ n: count() }).from(demandesOffres).where(eq(demandesOffres.statut, "envoyee")),
    db.select({ n: count() }).from(organisations).where(eq(organisations.type, "startup")),
    db.select({ n: count() }).from(organisations).where(eq(organisations.type, "pme")),
    db.select({ n: count() }).from(organisations).where(eq(organisations.type, "partenaire")),
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
    { label: "Startups Next 15", valeur: startups.n },
    { label: "Entreprises Scale Up", valeur: pme.n },
    { label: "Partenaires", valeur: partenaires.n },
  ];

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
          <div key={e.label}>
            <p className="text-lg font-bold text-encre tabular-nums">{e.valeur}</p>
            <p className="text-sm text-pierre">{e.label}</p>
          </div>
        ))}
        <Link
          href="/admin/annuaire"
          className="ml-auto self-center text-base text-vert hover:underline"
        >
          Parcourir l&apos;annuaire →
        </Link>
      </section>
    </div>
  );
}
