import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { candidatures, organisations, utilisateurs } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";

export default async function AdminAccueil() {
  await exigerRoot();

  const [[next15], [scaleup], [comptes], [dossiers]] = await Promise.all([
    db.select({ n: count() }).from(organisations).where(eq(organisations.type, "startup")),
    db.select({ n: count() }).from(organisations).where(eq(organisations.type, "pme")),
    db.select({ n: count() }).from(utilisateurs),
    db.select({ n: count() }).from(candidatures),
  ]);

  // Chaque tuile porte la teinte de ce qu'elle compte : on lit le tableau de bord d'un coup
  // d'œil, sans avoir à parcourir les libellés.
  const tuiles = [
    { label: "Startups Next 15", valeur: next15.n, teinte: "bg-feuille" },
    { label: "Entreprises Scale Up", valeur: scaleup.n, teinte: "bg-menthe" },
    { label: "Comptes", valeur: comptes.n, teinte: "bg-vert" },
    { label: "Candidatures importées", valeur: dossiers.n, teinte: "bg-orange" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tuiles.map((t) => (
          <div
            key={t.label}
            className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-vert/10"
          >
            <span className={`absolute inset-y-0 left-0 w-1 ${t.teinte}`} />
            <p className="text-3xl font-semibold text-encre tabular-nums">{t.valeur}</p>
            <p className="mt-1 text-sm text-pierre">{t.label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-vert/10">
        <h2 className="text-lg font-semibold">Par où commencer</h2>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm text-graphite">
          <li>
            Importer les lauréats depuis les exports de candidature :{" "}
            <code className="font-mono text-encre">npm run importer:candidatures</code>
          </li>
          <li>
            <Link href="/admin/acces" className="font-semibold text-vert hover:underline">
              Ouvrir un accès
            </Link>{" "}
            pour chaque lauréat : le lien de définition de mot de passe part par courriel.
          </li>
        </ol>
      </section>
    </div>
  );
}
