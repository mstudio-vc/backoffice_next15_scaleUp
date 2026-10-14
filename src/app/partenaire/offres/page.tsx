import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { journal, offres } from "@/db/schema";
import { exigerPartenaire } from "@/lib/garde";
import { EntetePage, Vide } from "@/components/page-entete";
import { CATEGORIE_OFFRE, CIBLE_OFFRE } from "@/lib/vocabulaire";

/** Les offres du partenaire connecté. La publication vit sur sa propre route. */
export default async function PartenaireOffres() {
  const s = await exigerPartenaire();

  const lignes = await db
    .select()
    .from(offres)
    .where(eq(offres.partenaireId, s.organisationId!))
    .orderBy(desc(offres.creeLe));

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

  return (
    <>
      <EntetePage
        titre="Mes offres"
        description="Elles deviennent visibles par les lauréats que vous ciblez, une fois votre compte validé."
        action={{ href: "/partenaire/offres/nouvelle", label: "Publier une offre" }}
      />

      <div className="flex flex-col gap-3">
        {lignes.map((o) => (
          <article
            key={o.id}
            className="flex flex-wrap items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-vert/10"
          >
            <div className="min-w-0 grow">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                <span className="rounded-full bg-feuille/10 px-2.5 py-1 text-vert">
                  {CATEGORIE_OFFRE[o.categorie]}
                </span>
                <span className="rounded-full bg-papier px-2.5 py-1 text-ardoise">
                  {CIBLE_OFFRE[o.cible]}
                </span>
                <span className={o.statut === "publiee" ? "text-vert" : "text-pierre"}>
                  {o.statut === "publiee" ? "publiée" : "retirée"}
                </span>
                {o.valideJusquAu ? (
                  <span className="text-pierre">
                    jusqu&apos;au {new Date(o.valideJusquAu).toLocaleDateString("fr-FR")}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-2 font-semibold text-encre">{o.titre}</h2>
              <p className="mt-1 text-sm whitespace-pre-line text-graphite">{o.description}</p>
            </div>
            <form action={basculer}>
              <input type="hidden" name="offreId" value={o.id} />
              <button
                name="statut"
                value={o.statut === "publiee" ? "retiree" : "publiee"}
                className="shrink-0 rounded-lg border border-brume px-3 py-1.5 text-sm font-medium text-graphite transition hover:bg-papier"
              >
                {o.statut === "publiee" ? "Retirer" : "Republier"}
              </button>
            </form>
          </article>
        ))}

        {lignes.length === 0 ? (
          <Vide
            texte="Aucune offre pour le moment."
            action={{ href: "/partenaire/offres/nouvelle", label: "Publier une offre" }}
          />
        ) : null}
      </div>
    </>
  );
}
