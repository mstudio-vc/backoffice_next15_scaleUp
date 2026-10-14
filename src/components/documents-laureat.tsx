import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documents } from "@/db/schema";
import { CarteTable, EntetePage, TD, TH, TR, Vide } from "@/components/page-entete";
import { CATEGORIE_DOCUMENT, VISIBILITE_DOCUMENT } from "@/lib/vocabulaire";
import { Pilule } from "@/components/badge";

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
        etat={`${lignes.length} document${lignes.length > 1 ? "s" : ""}`}
        action={{ href: `${base}/nouveau`, label: "Déposer un document" }}
      />

      {lignes.length === 0 ? (
        <Vide
          titre="Aucun document"
          action={{ href: `${base}/nouveau`, label: "Déposer le premier" }}
        />
      ) : (
        <CarteTable>
            <thead>
              <tr>
                <th className={TH}>Document</th>
                <th className={TH}>Catégorie</th>
                <th className={TH}>Version</th>
                <th className={TH}>Déposé</th>
                <th className={TH}>Qui le voit</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((d) => (
                <tr key={d.id} className={TR}>
                  <td className={TD}>
                    <span className="font-normal text-encre">{d.titre}</span>
                    <span className="block text-sm text-pierre">
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
                  <td className={`${TD} text-ardoise`}>{CATEGORIE_DOCUMENT[d.categorie]}</td>
                  <td className="px-5 py-3.5 text-ardoise tabular-nums">v{d.version}</td>
                  <td className={`${TD} text-ardoise`}>{d.deposeLe.toLocaleDateString("fr-FR")}</td>
                  <td className={TD}>
                    <Pilule>
                      {VISIBILITE_DOCUMENT[d.visibilite]}
                    </Pilule>
                  </td>
                </tr>
              ))}
            </tbody>
        </CarteTable>
      )}
    </>
  );
}
