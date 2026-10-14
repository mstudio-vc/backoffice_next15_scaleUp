import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { journal, organisations, utilisateurs } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";

const EXPORTS = [
  ["organisations", "Organisations"],
  ["utilisateurs", "Comptes"],
  ["offres", "Offres"],
  ["demandes", "Demandes d'offres"],
  ["documents", "Documents"],
  ["journal", "Journal"],
] as const;

export default async function Journal() {
  await exigerRoot();

  // Les 200 dernières lignes : un journal se consulte par la fin, et une page n'a pas à
  // charger une table qui grandit sans fin.
  const lignes = await db
    .select({
      id: journal.id,
      action: journal.action,
      cible: journal.cible,
      creeLe: journal.creeLe,
      auteur: utilisateurs.email,
      organisation: organisations.denominationSociale,
    })
    .from(journal)
    .leftJoin(utilisateurs, eq(utilisateurs.id, journal.utilisateurId))
    .leftJoin(organisations, eq(organisations.id, journal.organisationId))
    .orderBy(desc(journal.creeLe))
    .limit(200);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-vert/10">
        <h1 className="text-lg font-semibold">Exports</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {EXPORTS.map(([cle, label]) => (
            <a
              key={cle}
              href={`/admin/exports/${cle}`}
              className="rounded-lg px-4 py-2 text-sm font-medium text-graphite ring-1 ring-brume hover:bg-creme"
            >
              {label} (CSV)
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-vert/10">
        <h2 className="text-lg font-semibold">Journal d&apos;activité</h2>
        <p className="mt-1 text-sm text-pierre">Les 200 derniers évènements.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="text-left text-xs tracking-wide text-pierre uppercase">
              <tr>
                <th className="py-2 pr-4">Quand</th>
                <th className="py-2 pr-4">Qui</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2">Cible</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.id} className="border-t border-vert/10">
                  <td className="py-2.5 pr-4 whitespace-nowrap text-ardoise">
                    {l.creeLe.toLocaleString("fr-FR")}
                  </td>
                  <td className="py-2.5 pr-4 text-ardoise">{l.auteur ?? "système"}</td>
                  <td className="py-2.5 pr-4 font-medium">{l.action}</td>
                  <td className="py-2.5 text-ardoise">{l.cible ?? l.organisation ?? "—"}</td>
                </tr>
              ))}
              {lignes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-pierre">
                    Rien encore.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
