import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { journal, organisations } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import {
  STATUT_ORGANISATION,
  TYPE_ORGANISATION,
  TYPE_PARTENAIRE,
  type TypePartenaire,
} from "@/lib/vocabulaire";

export default async function AdminOrganisations() {
  await exigerRoot();

  const lignes = await db.select().from(organisations).orderBy(desc(organisations.creeLe));
  const enAttente = lignes.filter((o) => o.statut === "en_attente");

  async function creer(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    const nom = String(formData.get("nom") ?? "").trim();
    // Un lauréat ne se saisit pas à la main : il arrive par l'import des candidatures. Seuls
    // les partenaires se créent ici — un fonds en fait partie, avec le métier qui va bien.
    if (!nom) return;

    const metier = formData.get("typePartenaire") as TypePartenaire;
    if (!(metier in TYPE_PARTENAIRE)) return;

    const secteurs = String(formData.get("secteurs") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const [o] = await db
      .insert(organisations)
      .values({
        type: "partenaire",
        typePartenaire: metier,
        denominationSociale: nom,
        description: String(formData.get("description") ?? "").trim() || null,
        localisation: String(formData.get("localisation") ?? "").trim() || null,
        siteInternet: String(formData.get("siteInternet") ?? "").trim() || null,
        secteurs,
        // Créée par l'administration, donc validée d'office : il n'y a personne d'autre à
        // contrôler. Les lauréats, eux, arrivent par l'import et restent en attente.
        statut: "validee",
      })
      .returning({ id: organisations.id });

    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      organisationId: o.id,
      action: "organisation.creee",
      cible: nom,
      details: { type: "partenaire", typePartenaire: metier },
    });
    revalidatePath("/admin/organisations");
  }

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

  const champ = "h-11 rounded-lg border border-slate-300 px-3 font-normal";

  return (
    <div className="flex flex-col gap-8">
      {enAttente.length > 0 ? (
        <section className="rounded-2xl bg-amber-50 p-6 ring-1 ring-amber-200">
          <h1 className="text-lg font-semibold text-amber-900">
            {enAttente.length} organisation{enAttente.length > 1 ? "s" : ""} en attente de validation
          </h1>
          <p className="mt-1 text-sm text-amber-800">
            Tant qu&apos;une organisation n&apos;est pas validée, elle n&apos;apparaît pas dans
            l&apos;annuaire et ses membres ne voient pas les autres.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {enAttente.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3">
                <span className="min-w-0 grow font-medium">{o.denominationSociale}</span>
                <span className="text-sm text-slate-500">{TYPE_ORGANISATION[o.type]}</span>
                <form action={changerStatut} className="flex gap-2">
                  <input type="hidden" name="organisationId" value={o.id} />
                  <button
                    name="statut"
                    value="validee"
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    Valider
                  </button>
                  <button
                    name="statut"
                    value="suspendue"
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                  >
                    Refuser
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Ajouter un partenaire</h2>
        <p className="mt-1 text-sm text-slate-500">
          Fonds, banque, industriel ou institution. Les lauréats, eux, arrivent par l&apos;import
          des candidatures — on ne les saisit pas à la main.
        </p>
        <form action={creer} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Nom
            <input name="nom" required className={champ} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Métier
            <select name="typePartenaire" className={champ}>
              {Object.entries(TYPE_PARTENAIRE).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Localisation
            <input name="localisation" placeholder="Abidjan" className={champ} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Site internet
            <input name="siteInternet" type="url" className={champ} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Description
            <input name="description" className={champ} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Secteurs <span className="font-normal text-slate-500">(séparés par des virgules)</span>
            <input name="secteurs" placeholder="Fintech, Agritech" className={champ} />
          </label>
          <div>
            <button className="h-11 rounded-lg bg-slate-900 px-5 font-semibold text-white hover:bg-slate-800">
              Ajouter
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Toutes les organisations</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="text-left text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="py-2 pr-4">Organisation</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">État</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="py-3 pr-4 font-medium">{o.denominationSociale}</td>
                  <td className="py-3 pr-4 text-slate-600">{TYPE_ORGANISATION[o.type]}</td>
                  <td className="py-3 pr-4 text-slate-600">{STATUT_ORGANISATION[o.statut]}</td>
                  <td className="py-3 text-right">
                    <form action={changerStatut}>
                      <input type="hidden" name="organisationId" value={o.id} />
                      <button
                        name="statut"
                        value={o.statut === "suspendue" ? "validee" : "suspendue"}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                      >
                        {o.statut === "suspendue" ? "Réactiver" : "Suspendre"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {lignes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    Aucune organisation. Importez les lauréats, puis ajoutez les partenaires.
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
