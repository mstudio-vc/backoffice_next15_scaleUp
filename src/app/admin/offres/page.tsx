import { revalidatePath } from "next/cache";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { demandesOffres, journal, offres, organisations } from "@/db/schema";
import { alias } from "drizzle-orm/pg-core";
import { exigerRoot } from "@/lib/garde";
import { CATEGORIE_OFFRE, CIBLE_OFFRE, STATUT_DEMANDE } from "@/lib/vocabulaire";

export default async function AdminOffres() {
  await exigerRoot();

  const [partenaires, lignes] = await Promise.all([
    db
      .select({ id: organisations.id, nom: organisations.denominationSociale })
      .from(organisations)
      .where(eq(organisations.type, "partenaire"))
      .orderBy(organisations.denominationSociale),
    db
      .select({
        offre: offres,
        partenaire: organisations.denominationSociale,
        demandes: sql<number>`count(${demandesOffres.id})`.as("demandes"),
      })
      .from(offres)
      .innerJoin(organisations, eq(organisations.id, offres.partenaireId))
      .leftJoin(demandesOffres, eq(demandesOffres.offreId, offres.id))
      .groupBy(offres.id, organisations.denominationSociale)
      .orderBy(desc(offres.creeLe)),
  ]);

  const demandeur = alias(organisations, "demandeur");
  const demandes = await db
    .select({
      id: demandesOffres.id,
      statut: demandesOffres.statut,
      creeLe: demandesOffres.creeLe,
      offre: offres.titre,
      partenaire: organisations.denominationSociale,
      demandeur: demandeur.denominationSociale,
    })
    .from(demandesOffres)
    .innerJoin(offres, eq(offres.id, demandesOffres.offreId))
    .innerJoin(organisations, eq(organisations.id, offres.partenaireId))
    .innerJoin(demandeur, eq(demandeur.id, demandesOffres.organisationId))
    .orderBy(desc(demandesOffres.creeLe));

  async function traiter(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    const id = String(formData.get("demandeId"));
    const statut = formData.get("statut") === "acceptee" ? "acceptee" : "refusee";
    await db
      .update(demandesOffres)
      .set({ statut, traiteeLe: new Date() })
      .where(eq(demandesOffres.id, id));
    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      action: `demande.${statut}`,
      cible: id,
    });
    revalidatePath("/admin/offres");
  }

  async function publier(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    const partenaireId = String(formData.get("partenaireId") ?? "");
    const titre = String(formData.get("titre") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const valide = String(formData.get("valideJusquAu") ?? "").trim();
    if (!partenaireId || !titre || !description) return;

    const [o] = await db
      .insert(offres)
      .values({
        partenaireId,
        titre,
        description,
        categorie: formData.get("categorie") as keyof typeof CATEGORIE_OFFRE,
        cible: formData.get("cible") as keyof typeof CIBLE_OFFRE,
        valideJusquAu: valide || null,
      })
      .returning({ id: offres.id });

    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      action: "offre.publiee",
      cible: o.id,
      details: { titre },
    });
    revalidatePath("/admin/offres");
  }

  async function basculer(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    const id = String(formData.get("offreId"));
    const vers = formData.get("vers") === "publiee" ? "publiee" : "retiree";
    await db
      .update(offres)
      .set({ statut: vers, misAJourLe: new Date() })
      .where(eq(offres.id, id));
    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      action: vers === "retiree" ? "offre.retiree" : "offre.republiee",
      cible: id,
    });
    revalidatePath("/admin/offres");
  }

  const champ = "h-11 rounded-lg border border-brume px-3 font-normal";

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-vert/10">
        <h1 className="text-lg font-semibold">Publier une offre</h1>
        <p className="mt-1 text-sm text-pierre">
          Les partenaires n&apos;ont pas d&apos;espace à eux : l&apos;administration publie pour
          leur compte. L&apos;offre est rattachée à l&apos;organisation partenaire, pas à un
          compte — le jour où un espace partenaire existera, rien ne bougera en base.
        </p>

        {partenaires.length === 0 ? (
          <p className="mt-4 rounded-lg bg-orange/10 px-3 py-2 text-sm text-orange-sombre">
            Aucun partenaire en base. Créez-en un depuis{" "}
            <a href="/admin/organisations" className="font-semibold underline">
              Organisations
            </a>
            .
          </p>
        ) : (
          <form action={publier} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-graphite">
              Partenaire
              <select name="partenaireId" required className={champ}>
                {partenaires.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-graphite">
              Titre
              <input name="titre" required className={champ} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-graphite">
              Catégorie
              <select name="categorie" className={champ}>
                {Object.entries(CATEGORIE_OFFRE).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-graphite">
              Public visé
              <select name="cible" className={champ}>
                {Object.entries(CIBLE_OFFRE).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-graphite sm:col-span-2">
              Description
              <textarea name="description" required rows={3} className="rounded-lg border border-brume p-3 font-normal" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-graphite">
              Valable jusqu&apos;au
              <input type="date" name="valideJusquAu" className={champ} />
            </label>
            <div className="flex items-end">
              <button className="h-11 rounded-lg bg-vert px-5 font-semibold text-white hover:bg-vert-mid">
                Publier
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-vert/10">
        <h2 className="text-lg font-semibold">Demandes des lauréats</h2>
        <p className="mt-1 text-sm text-pierre">
          Faute d&apos;espace partenaire, c&apos;est l&apos;administration qui répond — après
          accord du partenaire concerné.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {demandes.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 border-t border-vert/10 pt-3">
              <div className="min-w-0 grow">
                <p className="font-medium">{d.demandeur}</p>
                <p className="text-sm text-pierre">
                  {d.offre} · {d.partenaire} · {d.creeLe.toLocaleDateString("fr-FR")}
                </p>
              </div>
              {d.statut === "envoyee" ? (
                <form action={traiter} className="flex gap-2">
                  <input type="hidden" name="demandeId" value={d.id} />
                  <button
                    name="statut"
                    value="acceptee"
                    className="rounded-lg bg-vert px-3 py-1.5 text-sm font-semibold text-white hover:bg-vert-mid"
                  >
                    Accepter
                  </button>
                  <button
                    name="statut"
                    value="refusee"
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-graphite ring-1 ring-brume hover:bg-creme"
                  >
                    Refuser
                  </button>
                </form>
              ) : (
                <span className="rounded-full bg-papier px-3 py-1 text-xs font-semibold text-ardoise">
                  {STATUT_DEMANDE[d.statut].toLowerCase()}
                </span>
              )}
            </div>
          ))}
          {demandes.length === 0 ? <p className="text-pierre">Aucune demande.</p> : null}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-vert/10">
        <h2 className="text-lg font-semibold">Offres</h2>
        <div className="mt-4 flex flex-col gap-3">
          {lignes.map(({ offre, partenaire, demandes }) => (
            <div key={offre.id} className="flex flex-wrap items-center gap-4 border-t border-vert/10 pt-3">
              <div className="min-w-0 grow">
                <p className="font-medium">{offre.titre}</p>
                <p className="text-sm text-pierre">
                  {partenaire} · {CATEGORIE_OFFRE[offre.categorie]} · {CIBLE_OFFRE[offre.cible]} ·{" "}
                  {Number(demandes)} demande{Number(demandes) > 1 ? "s" : ""}
                </p>
              </div>
              <span className="rounded-full bg-papier px-3 py-1 text-xs font-semibold text-ardoise">
                {offre.statut === "publiee" ? "publiée" : "retirée"}
              </span>
              <form action={basculer}>
                <input type="hidden" name="offreId" value={offre.id} />
                <input type="hidden" name="vers" value={offre.statut === "publiee" ? "retiree" : "publiee"} />
                <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-graphite ring-1 ring-brume hover:bg-creme">
                  {offre.statut === "publiee" ? "Retirer" : "Republier"}
                </button>
              </form>
            </div>
          ))}
          {lignes.length === 0 ? <p className="text-pierre">Aucune offre.</p> : null}
        </div>
      </section>
    </div>
  );
}
