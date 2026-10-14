import Link from "next/link";
import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { journal, organisations } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { Badge } from "@/components/badge";
import { BOUTON_CLAIR, BOUTON_DANGER } from "@/components/champ";
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

  async function changerStatut(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    const id = String(formData.get("organisationId"));
    const statut = formData.get("statut") as "validee" | "suspendue" | "en_attente";
    if (!["validee", "suspendue", "en_attente"].includes(statut)) return;

    await db
      .update(organisations)
      .set({ statut, misAJourLe: new Date() })
      .where(eq(organisations.id, id));
    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      organisationId: id,
      action: `organisation.${statut}`,
    });
    revalidatePath("/admin/organisations");
  }

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
                ? "bg-vert font-normal text-white"
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
              <th className={`${TH} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((o) => (
              <tr key={o.id} className={TR}>
                <td className={TD}>
                  <span className="font-normal text-encre">{o.denominationSociale}</span>
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
                  <form action={changerStatut} className="inline-flex gap-1.5">
                    <input type="hidden" name="organisationId" value={o.id} />
                    {o.statut === "en_attente" ? (
                      <>
                        <button name="statut" value="validee" className={BOUTON_CLAIR}>
                          Valider
                        </button>
                        <button name="statut" value="suspendue" className={BOUTON_DANGER}>
                          Refuser
                        </button>
                      </>
                    ) : (
                      <button
                        name="statut"
                        value={o.statut === "suspendue" ? "validee" : "suspendue"}
                        className={o.statut === "suspendue" ? BOUTON_CLAIR : BOUTON_DANGER}
                      >
                        {o.statut === "suspendue" ? "Réactiver" : "Suspendre"}
                      </button>
                    )}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </CarteTable>
      )}
    </>
  );
}
