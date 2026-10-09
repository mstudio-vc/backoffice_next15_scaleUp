import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { journal, offres } from "@/db/schema";
import { exigerPartenaire } from "@/lib/garde";
import {
  CATEGORIE_OFFRE,
  CIBLE_OFFRE,
  type CategorieOffre,
  type CibleOffre,
} from "@/lib/vocabulaire";

/** Les offres du partenaire connecté : publier, retirer, republier. */
export default async function PartenaireOffres() {
  const s = await exigerPartenaire();

  const lignes = await db
    .select()
    .from(offres)
    .where(eq(offres.partenaireId, s.organisationId!))
    .orderBy(desc(offres.creeLe));

  async function publier(formData: FormData) {
    "use server";
    const session = await exigerPartenaire();
    const titre = String(formData.get("titre") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!titre || !description) return;

    const categorie = formData.get("categorie") as CategorieOffre;
    const cible = formData.get("cible") as CibleOffre;
    if (!(categorie in CATEGORIE_OFFRE) || !(cible in CIBLE_OFFRE)) return;

    const validite = String(formData.get("valideJusquAu") ?? "").trim();

    await db.insert(offres).values({
      // Le partenaire vient de la session : une offre ne se publie pas au nom d'un autre.
      partenaireId: session.organisationId!,
      titre,
      description,
      categorie,
      cible,
      valideJusquAu: validite || null,
    });
    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      organisationId: session.organisationId,
      action: "offre.publiee",
      cible: titre,
    });
    revalidatePath("/partenaire/offres");
  }

  async function basculer(formData: FormData) {
    "use server";
    const session = await exigerPartenaire();
    const id = String(formData.get("offreId"));
    const statut = formData.get("statut") as "publiee" | "retiree";
    if (!["publiee", "retiree"].includes(statut)) return;

    // La condition sur `partenaireId` est la vraie protection : sans elle, un identifiant
    // d'offre forgé permettrait de retirer l'offre d'un autre partenaire.
    await db
      .update(offres)
      .set({ statut, misAJourLe: new Date() })
      .where(and(eq(offres.id, id), eq(offres.partenaireId, session.organisationId!)));

    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      organisationId: session.organisationId,
      action: `offre.${statut}`,
      cible: id,
    });
    revalidatePath("/partenaire/offres");
  }

  const champ = "h-11 rounded-lg border border-slate-300 px-3 font-normal";

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold">Publier une offre</h1>
        <p className="mt-1 text-sm text-slate-500">
          Elle devient visible par les lauréats que vous ciblez, une fois votre compte validé.
        </p>
        <form action={publier} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Titre
            <input name="titre" required className={champ} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Catégorie
            <select name="categorie" className={champ}>
              {Object.entries(CATEGORIE_OFFRE).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Destinataires
            <select name="cible" className={champ}>
              {Object.entries(CIBLE_OFFRE).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Valable jusqu&apos;au <span className="font-normal text-slate-500">(facultatif)</span>
            <input name="valideJusquAu" type="date" className={champ} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Description
            <textarea
              name="description"
              rows={4}
              required
              className="rounded-lg border border-slate-300 p-3 font-normal"
            />
          </label>
          <div>
            <button className="h-11 rounded-lg bg-slate-900 px-5 font-semibold text-white hover:bg-slate-800">
              Publier
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Mes offres</h2>
        <div className="mt-4 flex flex-col gap-3">
          {lignes.map((o) => (
            <article key={o.id} className="flex flex-wrap items-start gap-4 rounded-xl p-4 ring-1 ring-slate-200">
              <div className="min-w-0 grow">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-800">
                    {CATEGORIE_OFFRE[o.categorie]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                    {CIBLE_OFFRE[o.cible]}
                  </span>
                  <span className={o.statut === "publiee" ? "text-emerald-700" : "text-slate-500"}>
                    {o.statut === "publiee" ? "publiée" : "retirée"}
                  </span>
                </div>
                <h3 className="mt-2 font-semibold">{o.titre}</h3>
                <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{o.description}</p>
              </div>
              <form action={basculer}>
                <input type="hidden" name="offreId" value={o.id} />
                <button
                  name="statut"
                  value={o.statut === "publiee" ? "retiree" : "publiee"}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                >
                  {o.statut === "publiee" ? "Retirer" : "Republier"}
                </button>
              </form>
            </article>
          ))}
          {lignes.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
              Aucune offre pour le moment.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
