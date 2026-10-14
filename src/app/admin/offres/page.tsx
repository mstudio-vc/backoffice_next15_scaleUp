import Link from "next/link";
import { revalidatePath } from "next/cache";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { demandesOffres, journal, offres, organisations } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { EntetePage, Vide } from "@/components/page-entete";
import { CATEGORIE_OFFRE, CIBLE_OFFRE } from "@/lib/vocabulaire";
import { Badge, Pilule } from "@/components/badge";
import { Couverture } from "@/components/couverture";

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
        etat={`${lignes.length} offre${lignes.length > 1 ? "s" : ""} · ${Number(attente.n)} demande${
          Number(attente.n) > 1 ? "s" : ""
        } en attente`}
        action={{ href: "/admin/offres/nouvelle", label: "Publier une offre" }}
      />

      {/* Le chiffre est déjà dans la ligne d'état : il ne lui faut qu'un chemin, pas un encart. */}
      {Number(attente.n) > 0 ? (
        <Link
          href="/admin/offres/demandes"
          className="mb-3 inline-block text-base font-normal text-orange-sombre hover:underline"
        >
          Traiter les {Number(attente.n)} demande{Number(attente.n) > 1 ? "s" : ""} →
        </Link>
      ) : null}

      {lignes.length === 0 ? (
        <Vide
          titre="Aucune offre publiée"
          action={{ href: "/admin/offres/nouvelle", label: "Publier la première" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lignes.map(({ offre, partenaire, demandes }) => (
            <article
              key={offre.id}
              className="flex flex-col overflow-hidden rounded bg-white p-4 ring-1 ring-brume"
            >
              <Couverture url={offre.couvertureUrl} cadre="-mx-4 -mt-4 mb-3" />
              <div className="flex flex-wrap items-center gap-2">
                <Pilule>
                  {CATEGORIE_OFFRE[offre.categorie]}
                </Pilule>
                <Pilule>
                  {CIBLE_OFFRE[offre.cible]}
                </Pilule>
                <span className="ml-auto">
                  <Badge ton={offre.statut === "publiee" ? "succes" : "inactif"}>
                    {offre.statut === "publiee" ? "Publiée" : "Retirée"}
                  </Badge>
                </span>
              </div>

              <h2 className="mt-3 font-bold text-encre">{offre.titre}</h2>
              <p className="text-sm text-pierre">{partenaire}</p>
              <p className="mt-2 line-clamp-3 text-sm text-ardoise">{offre.description}</p>

              <div className="mt-4 flex items-center gap-3 border-t border-brume pt-3">
                <span className="text-sm text-pierre">
                  {Number(demandes)} demande{Number(demandes) > 1 ? "s" : ""}
                  {offre.valideJusquAu
                    ? ` · jusqu'au ${new Date(offre.valideJusquAu).toLocaleDateString("fr-FR")}`
                    : ""}
                </span>
                <form action={basculer} className="ml-auto">
                  <input type="hidden" name="offreId" value={offre.id} />
                  <input type="hidden" name="vers" value={offre.statut === "publiee" ? "retiree" : "publiee"} />
                  <button className="rounded border border-brume px-3 py-1.5 text-sm font-normal text-graphite transition hover:bg-papier">
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
