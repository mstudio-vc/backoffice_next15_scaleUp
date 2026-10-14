import Link from "next/link";
import { revalidatePath } from "next/cache";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { demandesOffres, journal, offres, organisations } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { EntetePage, Vide } from "@/components/page-entete";
import { CATEGORIE_OFFRE, CIBLE_OFFRE } from "@/lib/vocabulaire";

export default async function AdminOffres() {
  await exigerRoot();

  const [lignes, [attente]] = await Promise.all([
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
    db
      .select({ n: sql<number>`count(*)` })
      .from(demandesOffres)
      .where(eq(demandesOffres.statut, "envoyee")),
  ]);

  async function basculer(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    const id = String(formData.get("offreId"));
    const vers = formData.get("vers") === "publiee" ? "publiee" : "retiree";
    await db.update(offres).set({ statut: vers, misAJourLe: new Date() }).where(eq(offres.id, id));
    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      action: vers === "retiree" ? "offre.retiree" : "offre.republiee",
      cible: id,
    });
    revalidatePath("/admin/offres");
  }

  return (
    <>
      <EntetePage
        titre="Offres"
        description="Les avantages négociés auprès des partenaires, proposés aux lauréats."
        action={{ href: "/admin/offres/nouvelle", label: "Publier une offre" }}
      />

      {Number(attente.n) > 0 ? (
        <Link
          href="/admin/offres/demandes"
          className="mb-6 flex items-center gap-3 rounded-2xl border-l-4 border-orange bg-orange/5 px-5 py-4 transition hover:bg-orange/10"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-orange text-sm font-bold text-white">
            {Number(attente.n)}
          </span>
          <span className="text-[15px] font-medium text-graphite">
            demande{Number(attente.n) > 1 ? "s" : ""} de lauréats en attente de réponse
          </span>
          <span className="ml-auto text-sm font-semibold text-orange-sombre">Traiter →</span>
        </Link>
      ) : null}

      {lignes.length === 0 ? (
        <Vide
          texte="Aucune offre publiée."
          action={{ href: "/admin/offres/nouvelle", label: "Publier la première" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lignes.map(({ offre, partenaire, demandes }) => (
            <article
              key={offre.id}
              className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-vert/10"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                <span className="rounded-full bg-feuille/10 px-2.5 py-1 text-vert">
                  {CATEGORIE_OFFRE[offre.categorie]}
                </span>
                <span className="rounded-full bg-papier px-2.5 py-1 text-ardoise">
                  {CIBLE_OFFRE[offre.cible]}
                </span>
                <span
                  className={`ml-auto rounded-full px-2.5 py-1 ${
                    offre.statut === "publiee" ? "bg-vert/10 text-vert" : "bg-papier text-pierre"
                  }`}
                >
                  {offre.statut === "publiee" ? "publiée" : "retirée"}
                </span>
              </div>

              <h2 className="mt-3 font-semibold text-encre">{offre.titre}</h2>
              <p className="text-sm text-pierre">{partenaire}</p>
              <p className="mt-2 line-clamp-3 text-sm text-ardoise">{offre.description}</p>

              <div className="mt-4 flex items-center gap-3 border-t border-vert/10 pt-3">
                <span className="text-sm text-pierre">
                  {Number(demandes)} demande{Number(demandes) > 1 ? "s" : ""}
                  {offre.valideJusquAu
                    ? ` · jusqu'au ${new Date(offre.valideJusquAu).toLocaleDateString("fr-FR")}`
                    : ""}
                </span>
                <form action={basculer} className="ml-auto">
                  <input type="hidden" name="offreId" value={offre.id} />
                  <input type="hidden" name="vers" value={offre.statut === "publiee" ? "retiree" : "publiee"} />
                  <button className="rounded-lg border border-brume px-3 py-1.5 text-sm font-medium text-graphite transition hover:bg-papier">
                    {offre.statut === "publiee" ? "Retirer" : "Republier"}
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
