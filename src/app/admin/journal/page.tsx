import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { journal, organisations, utilisateurs } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { TD, TH, TR } from "@/components/page-entete";

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
      <section className="rounded bg-white p-6 ring-1 ring-brume">
        <h1 className="text-lg font-bold">Exports</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {EXPORTS.map(([cle, label]) => (
            <a
              key={cle}
              href={`/admin/exports/${cle}`}
              className="rounded px-4 py-2 text-sm font-normal text-graphite ring-1 ring-brume hover:bg-creme"
            >
              {label} (CSV)
            </a>
          ))}
        </div>
      </section>

      <section className="rounded bg-white p-6 ring-1 ring-brume">
        <h2 className="text-lg font-bold">Journal d&apos;activité</h2>
        <p className="mt-1 text-sm text-pierre">Les 200 derniers évènements.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr>
                <th className={`${TH} pr-4`}>Quand</th>
                <th className={`${TH} pr-4`}>Qui</th>
                <th className={`${TH} pr-4`}>Action</th>
                <th className={TH}>Cible</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.id} className={TR}>
                  <td className={`${TD} pr-4 whitespace-nowrap text-ardoise`}>
                    {l.creeLe.toLocaleString("fr-FR")}
                  </td>
                  <td className={`${TD} pr-4 text-ardoise`}>{l.auteur ?? "système"}</td>
                  <td className={`${TD} pr-4 font-normal`}>{l.action}</td>
                  <td className={`${TD} text-ardoise`}>{l.cible ?? l.organisation ?? "—"}</td>
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
