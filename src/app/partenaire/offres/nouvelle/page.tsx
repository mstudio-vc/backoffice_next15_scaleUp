import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { journal, offres } from "@/db/schema";
import { exigerPartenaire } from "@/lib/garde";
import { Retour } from "@/components/page-entete";
import { FormulaireOffre } from "@/components/formulaire-offre";
import { RefusImage, hebergeurImages, televerserImage } from "@/lib/images";
import {
  CATEGORIE_OFFRE,
  CIBLE_OFFRE,
  type CategorieOffre,
  type CibleOffre,
} from "@/lib/vocabulaire";

export default async function NouvelleOffre({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  await exigerPartenaire();
  const { erreur } = await searchParams;

  async function publier(formData: FormData) {
    "use server";
    const session = await exigerPartenaire();
    const titre = String(formData.get("titre") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!titre || !description) redirect("/partenaire/offres/nouvelle?erreur=champs");

    const categorie = formData.get("categorie") as CategorieOffre;
    const cible = formData.get("cible") as CibleOffre;
    // Les deux listes viennent du formulaire, mais une valeur se forge : sans ce contrôle,
    // l'insertion échouerait sur l'énumération de la base, avec une erreur illisible.
    if (!(categorie in CATEGORIE_OFFRE) || !(cible in CIBLE_OFFRE)) {
      redirect("/partenaire/offres/nouvelle?erreur=champs");
    }

    const validite = String(formData.get("valideJusquAu") ?? "").trim();

    let couvertureUrl: string | null = null;
    const fichier = formData.get("couverture");
    if (fichier instanceof File && fichier.size > 0) {
      try {
        couvertureUrl = await televerserImage(fichier, "offres");
      } catch (e) {
        redirect(
          `/partenaire/offres/nouvelle?erreur=${e instanceof RefusImage ? e.code : "envoi"}`,
        );
      }
    }

    await db.insert(offres).values({
      // Le partenaire vient de la session : une offre ne se publie pas au nom d'un autre.
      partenaireId: session.organisationId!,
      titre,
      description,
      categorie,
      cible,
      valideJusquAu: validite || null,
      couvertureUrl,
    });
    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      organisationId: session.organisationId,
      action: "offre.publiee",
      cible: titre,
      details: { couverture: couvertureUrl !== null },
    });
    redirect("/partenaire/offres");
  }

  return (
    <>
      <Retour href="/partenaire/offres" label="Mes offres" />
      <h1 className="mb-4 text-2xl font-bold text-encre">Publier une offre</h1>

      <FormulaireOffre
        action={publier}
        retour="/partenaire/offres"
        erreur={erreur}
        avecCouverture={hebergeurImages() === "cloudinary"}
      />
    </>
  );
}
