import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documents } from "@/db/schema";
import { EntetePage, Vide } from "@/components/page-entete";
import { CATEGORIE_DOCUMENT, VISIBILITE_DOCUMENT } from "@/lib/vocabulaire";

function poids(octets: number | null): string {
  if (!octets) return "—";
  return octets < 1024 * 1024
    ? `${Math.round(octets / 1024)} Ko`
    : `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

/** La liste, et rien d'autre : le dépôt vit sur sa propre route. */
export async function DocumentsLaureat({
  organisationId,
  base,
}: {
  organisationId: string;
  base: string;
}) {
  const lignes = await db
    .select()
    .from(documents)
    .where(eq(documents.organisationId, organisationId))
    .orderBy(desc(documents.deposeLe));

  return (
    <>
      <EntetePage
        titre="Documents"
        description="Vos pièces justificatives et vos présentations. Redéposer sous le même titre crée une version, sans rien effacer."
        action={{ href: `${base}/nouveau`, label: "Déposer un document" }}
      />

      {lignes.length === 0 ? (
        <Vide
          texte="Aucun document déposé."
          action={{ href: `${base}/nouveau`, label: "Déposer le premier" }}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-vert/10">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="border-b border-vert/10 text-left text-[11px] tracking-wide text-pierre uppercase">
              <tr>
                <th className="px-5 py-3">Document</th>
                <th className="px-5 py-3">Catégorie</th>
                <th className="px-5 py-3">Version</th>
                <th className="px-5 py-3">Déposé</th>
                <th className="px-5 py-3">Qui le voit</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((d) => (
                <tr key={d.id} className="border-b border-vert/5 last:border-0 hover:bg-papier/60">
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-encre">{d.titre}</span>
                    <span className="block text-xs text-pierre">
                      {d.lien ? (
                        <a href={d.lien} target="_blank" rel="noopener noreferrer" className="text-vert hover:underline">
                          Ouvrir le lien
                        </a>
                      ) : (
                        <>
                          <a href={`/documents/${d.id}`} className="text-vert hover:underline">
                            Télécharger
                          </a>{" "}
                          · {poids(d.tailleOctets)}
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-ardoise">{CATEGORIE_DOCUMENT[d.categorie]}</td>
                  <td className="px-5 py-3.5 text-ardoise tabular-nums">v{d.version}</td>
                  <td className="px-5 py-3.5 text-ardoise">{d.deposeLe.toLocaleDateString("fr-FR")}</td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-full bg-papier px-2.5 py-1 text-xs font-medium text-ardoise">
                      {VISIBILITE_DOCUMENT[d.visibilite]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
