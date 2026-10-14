import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { organisations } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { Badge } from "@/components/badge";
import { CarteTable, EntetePage, TD, TH, TR, Vide } from "@/components/page-entete";
import {
  STATUT_ORGANISATION,
  TON_STATUT_ORGANISATION,
  TYPE_ORGANISATION,
} from "@/lib/vocabulaire";

/**
 * Deux vues au lieu d'un bloc d'alerte.
 *
 * L'écran affichait les organisations à valider DEUX fois : dans un encart en haut, puis dans
 * la grille. Le même objet montré deux fois se lit comme deux objets, et l'encart poussait la
 * grille sous la ligne de flottaison. Une vue filtre la liste, elle ne la duplique pas.
 *
 * Aucune écriture ne part d'ici. La liste mène à la fiche, la fiche mène à la confirmation,
 * et c'est la confirmation qui écrit (règles 5 et 8).
 */
const VUES = [
  { cle: "a-traiter", label: "À traiter" },
  { cle: "toutes", label: "Toutes" },
] as const;

export default async function AdminOrganisations({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string }>;
}) {
  await exigerRoot();
  const { vue } = await searchParams;
  const active = VUES.find((v) => v.cle === vue) ?? VUES[0];

  const toutes = await db.select().from(organisations).orderBy(desc(organisations.creeLe));
  const enAttente = toutes.filter((o) => o.statut === "en_attente");
  const lignes = active.cle === "a-traiter" ? enAttente : toutes;

  return (
    <>
      <EntetePage
        titre="Organisations"
        etat={`${toutes.length} au total · ${enAttente.length} à valider`}
        action={{ href: "/admin/organisations/nouvelle", label: "Ajouter un partenaire" }}
      />

      <div className="mb-3 flex items-center gap-2">
        {VUES.map((v) => (
          <Link
            key={v.cle}
            href={`/admin/organisations?vue=${v.cle}`}
            className={`rounded px-2.5 py-1 text-base ${
              v.cle === active.cle
                ? "bg-vert font-bold text-white"
                : "text-ardoise hover:bg-papier"
            }`}
          >
            {v.label}
            <span className="ml-1.5 opacity-70">
              {v.cle === "a-traiter" ? enAttente.length : toutes.length}
            </span>
          </Link>
        ))}
      </div>

      {lignes.length === 0 ? (
        <Vide
          titre={active.cle === "a-traiter" ? "Rien à valider" : "Aucune organisation"}
          texte={
            active.cle === "a-traiter" ? undefined : "Importez les lauréats, puis les partenaires."
          }
          action={
            active.cle === "a-traiter"
              ? { href: "/admin/organisations?vue=toutes", label: "Voir toutes" }
              : { href: "/admin/import", label: "Importer des lauréats" }
          }
        />
      ) : (
        <CarteTable>
          <thead>
            <tr>
              <th className={TH}>Organisation</th>
              <th className={TH}>Type</th>
              <th className={TH}>État</th>
              <th className={`${TH} text-right`}>Fiche</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((o) => (
              <tr key={o.id} className={TR}>
                <td className={TD}>
                  {/* La ligne ouvre la fiche. On lit, puis on agit (règle 8). */}
                  <Link
                    href={`/admin/organisations/${o.id}`}
                    className="font-bold text-vert hover:underline"
                  >
                    {o.denominationSociale}
                  </Link>
                  {o.localisation ? (
                    <span className="block text-sm text-pierre">{o.localisation}</span>
                  ) : null}
                </td>
                <td className={`${TD} text-ardoise`}>{TYPE_ORGANISATION[o.type]}</td>
                <td className={TD}>
                  <Badge ton={TON_STATUT_ORGANISATION[o.statut]}>
                    {STATUT_ORGANISATION[o.statut]}
                  </Badge>
                </td>
                <td className={`${TD} text-right`}>
                  <Link
                    href={`/admin/organisations/${o.id}`}
                    className="text-base text-vert hover:underline"
                  >
                    Ouvrir →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </CarteTable>
      )}
    </>
  );
}
