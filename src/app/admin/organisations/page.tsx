import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { journal, organisations } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { EntetePage, Vide } from "@/components/page-entete";
import { STATUT_ORGANISATION, TYPE_ORGANISATION } from "@/lib/vocabulaire";

const PASTILLE = {
  en_attente: "bg-orange/15 text-orange-sombre",
  validee: "bg-feuille/15 text-vert",
  suspendue: "bg-papier text-pierre",
} as const;

export default async function AdminOrganisations() {
  await exigerRoot();

  const lignes = await db.select().from(organisations).orderBy(desc(organisations.creeLe));
  const enAttente = lignes.filter((o) => o.statut === "en_attente");

  async function changerStatut(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    const id = String(formData.get("organisationId"));
    const statut = formData.get("statut") as "validee" | "suspendue" | "en_attente";
    if (!["validee", "suspendue", "en_attente"].includes(statut)) return;

    await db.update(organisations).set({ statut, misAJourLe: new Date() }).where(eq(organisations.id, id));
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
        description="Lauréats et partenaires. Les lauréats arrivent par l'import des candidatures ; les partenaires s'ajoutent ici."
        action={{ href: "/admin/organisations/nouvelle", label: "Ajouter un partenaire" }}
      />

      {enAttente.length > 0 ? (
        <section className="mb-6 rounded-2xl border-l-4 border-orange bg-orange/5 p-5">
          <h2 className="font-semibold text-orange-sombre">
            {enAttente.length} organisation{enAttente.length > 1 ? "s" : ""} à valider
          </h2>
          <p className="mt-1 text-sm text-graphite">
            Tant qu&apos;une organisation n&apos;est pas validée, elle n&apos;apparaît pas dans
            l&apos;annuaire et ses membres ne voient pas les autres.
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {enAttente.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3">
                <span className="min-w-0 grow font-medium text-encre">{o.denominationSociale}</span>
                <span className="text-sm text-pierre">{TYPE_ORGANISATION[o.type]}</span>
                <form action={changerStatut} className="flex gap-2">
                  <input type="hidden" name="organisationId" value={o.id} />
                  <button
                    name="statut"
                    value="validee"
                    className="rounded-lg bg-vert px-3 py-1.5 text-sm font-semibold text-white hover:bg-vert-mid"
                  >
                    Valider
                  </button>
                  <button
                    name="statut"
                    value="suspendue"
                    className="rounded-lg border border-brume bg-white px-3 py-1.5 text-sm font-medium text-graphite hover:bg-papier"
                  >
                    Refuser
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lignes.length === 0 ? (
        <Vide texte="Aucune organisation. Importez les lauréats, puis ajoutez les partenaires." />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-vert/10">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="border-b border-vert/10 text-left text-[11px] tracking-wide text-pierre uppercase">
              <tr>
                <th className="px-5 py-3">Organisation</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">État</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((o) => (
                <tr key={o.id} className="border-b border-vert/5 last:border-0 hover:bg-papier/60">
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-encre">{o.denominationSociale}</span>
                    {o.localisation ? (
                      <span className="block text-xs text-pierre">{o.localisation}</span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3.5 text-ardoise">{TYPE_ORGANISATION[o.type]}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PASTILLE[o.statut]}`}>
                      {STATUT_ORGANISATION[o.statut]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <form action={changerStatut}>
                      <input type="hidden" name="organisationId" value={o.id} />
                      <button
                        name="statut"
                        value={o.statut === "suspendue" ? "validee" : "suspendue"}
                        className="rounded-lg border border-brume px-3 py-1.5 text-sm font-medium text-graphite transition hover:bg-papier"
                      >
                        {o.statut === "suspendue" ? "Réactiver" : "Suspendre"}
                      </button>
                    </form>
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
