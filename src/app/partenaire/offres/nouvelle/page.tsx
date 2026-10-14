import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { journal, offres } from "@/db/schema";
import { exigerPartenaire } from "@/lib/garde";
import { Champ, BOUTON } from "@/components/champ";
import { CarteFormulaire, Retour } from "@/components/page-entete";
import {
  CATEGORIE_OFFRE,
  CIBLE_OFFRE,
  type CategorieOffre,
  type CibleOffre,
} from "@/lib/vocabulaire";

export default async function NouvelleOffre() {
  await exigerPartenaire();

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
    redirect("/partenaire/offres");
  }

  const champSelect =
    "h-11 rounded-xl border border-brume bg-white px-3.5 text-[15px] text-encre outline-none focus:border-vert focus:ring-4 focus:ring-vert/10";

  return (
    <>
      <Retour href="/partenaire/offres" label="Mes offres" />
      <h1 className="mb-1 text-2xl font-semibold text-encre">Publier une offre</h1>
      <p className="mb-6 max-w-2xl text-[15px] text-ardoise">
        Choisissez qui elle vise : une offre réservée aux PME n&apos;atteindra pas les startups.
      </p>

      <CarteFormulaire>
        <form action={publier} className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Champ label="Titre" name="titre" required placeholder="Compte professionnel sans frais la première année" />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-graphite">Catégorie</span>
            <select name="categorie" className={champSelect}>
              {Object.entries(CATEGORIE_OFFRE).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-graphite">Destinataires</span>
            <select name="cible" className={champSelect}>
              {Object.entries(CIBLE_OFFRE).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>

          <Champ label="Valable jusqu'au" name="valideJusquAu" type="date" aide="Facultatif." />

          <div className="sm:col-span-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-graphite">Description</span>
              <textarea
                name="description"
                rows={5}
                required
                className="rounded-xl border border-brume bg-white p-3.5 text-[15px] text-encre outline-none focus:border-vert focus:ring-4 focus:ring-vert/10"
              />
            </label>
          </div>

          <div className="sm:col-span-2">
            <button className={BOUTON}>Publier l&apos;offre</button>
          </div>
        </form>
      </CarteFormulaire>
    </>
  );
}
