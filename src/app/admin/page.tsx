import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { candidatures, organisations, utilisateurs } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";

export default async function AdminAccueil() {
  await exigerRoot();

  const [[next15], [scaleup], [comptes], [dossiers]] = await Promise.all([
    db.select({ n: count() }).from(organisations).where(eq(organisations.programme, "next15")),
    db.select({ n: count() }).from(organisations).where(eq(organisations.programme, "scaleup")),
    db.select({ n: count() }).from(utilisateurs),
    db.select({ n: count() }).from(candidatures),
  ]);

  const tuiles = [
    { label: "Startups Next 15", valeur: next15.n },
    { label: "Entreprises Scale Up", valeur: scaleup.n },
    { label: "Comptes", valeur: comptes.n },
    { label: "Candidatures importées", valeur: dossiers.n },
  ];

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tuiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-3xl font-semibold tabular-nums">{t.valeur}</p>
            <p className="mt-1 text-sm text-slate-500">{t.label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Par où commencer</h2>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm text-slate-700">
          <li>
            Importer les lauréats depuis les exports de candidature :{" "}
            <code className="font-mono text-slate-900">npm run importer:candidatures</code>
          </li>
          <li>
            <Link href="/admin/acces" className="font-semibold text-indigo-700 hover:underline">
              Ouvrir un accès
            </Link>{" "}
            pour chaque lauréat : le lien de définition de mot de passe part par courriel.
          </li>
        </ol>
      </section>
    </div>
  );
}
