import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { journal, offres, organisations } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { Champ, BOUTON } from "@/components/champ";
import { CarteFormulaire, Retour } from "@/components/page-entete";
import { CATEGORIE_OFFRE, CIBLE_OFFRE } from "@/lib/vocabulaire";

export default async function NouvelleOffre() {
  await exigerRoot();

  const partenaires = await db
    .select({ id: organisations.id, nom: organisations.denominationSociale })
    .from(organisations)
    .where(eq(organisations.type, "partenaire"))
    .orderBy(organisations.denominationSociale);

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
    redirect("/admin/offres");
  }

  const champSelect =
    "h-8 rounded border border-brume bg-white px-3.5 text-base text-encre outline-none focus:border-vert focus:ring-4 focus:ring-brume";

  return (
    <>
      <Retour href="/admin/offres" label="Offres" />
      {/* L'offre est rattachée à l'ORGANISATION partenaire, pas à un compte : le jour où un
          espace partenaire existera, rien ne bougera en base. */}
      <h1 className="mb-4 text-2xl font-bold text-encre">Publier une offre</h1>

      <CarteFormulaire>
        {partenaires.length === 0 ? (
          <p className="rounded border-l-4 border-orange bg-orange/5 px-4 py-3 text-sm text-graphite">
            Aucun partenaire en base. Ajoutez-en un depuis Organisations avant de publier.
          </p>
        ) : (
          <form action={publier} className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-base font-bold text-graphite">Partenaire</span>
              <select name="partenaireId" required className={champSelect}>
                {partenaires.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </label>

            <Champ label="Titre" name="titre" required placeholder="Compte professionnel sans frais la première année" />

            <label className="flex flex-col gap-1.5">
              <span className="text-base font-bold text-graphite">Catégorie</span>
              <select name="categorie" className={champSelect}>
                {Object.entries(CATEGORIE_OFFRE).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-base font-bold text-graphite">Public visé</span>
              <select name="cible" className={champSelect}>
                {Object.entries(CIBLE_OFFRE).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-base font-bold text-graphite">Description</span>
              <textarea
                name="description"
                required
                rows={4}
                placeholder="Ce que le lauréat obtient concrètement, et à quelles conditions."
                className="rounded border border-brume bg-white p-3.5 text-base text-encre outline-none placeholder:text-pierre focus:border-vert focus:ring-4 focus:ring-brume"
              />
            </label>

            <Champ label="Valable jusqu'au" name="valideJusquAu" type="date" aide="Facultatif." />

            <div className="flex items-end">
              <button className={BOUTON}>Publier l&apos;offre</button>
            </div>
          </form>
        )}
      </CarteFormulaire>
    </>
  );
}
