import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { journal, offres, organisations } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
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
  await exigerRoot();
  const { erreur } = await searchParams;

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

    if (!partenaireId) redirect("/admin/offres/nouvelle?erreur=partenaire");
    if (!titre || !description) redirect("/admin/offres/nouvelle?erreur=champs");

    const categorie = formData.get("categorie") as CategorieOffre;
    const cible = formData.get("cible") as CibleOffre;
    // Une valeur de liste se forge : sans ce contrôle, l'insertion échouerait sur
    // l'énumération de la base, avec une erreur illisible.
    if (!(categorie in CATEGORIE_OFFRE) || !(cible in CIBLE_OFFRE)) {
      redirect("/admin/offres/nouvelle?erreur=champs");
    }

    // L'image part AVANT l'insertion : si l'hébergeur la refuse, aucune offre n'est créée, et
    // la personne retrouve son formulaire avec la raison du refus. L'inverse laisserait une
    // offre publiée sans sa couverture, sans que personne le sache.
    let couvertureUrl: string | null = null;
    const fichier = formData.get("couverture");
    if (fichier instanceof File && fichier.size > 0) {
      try {
        couvertureUrl = await televerserImage(fichier, "offres");
      } catch (e) {
        redirect(
          `/admin/offres/nouvelle?erreur=${e instanceof RefusImage ? e.code : "envoi"}`,
        );
      }
    }

    const [o] = await db
      .insert(offres)
      .values({
        partenaireId,
        titre,
        description,
        categorie,
        cible,
        valideJusquAu: valide || null,
        couvertureUrl,
      })
      .returning({ id: offres.id });

    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      action: "offre.publiee",
      cible: o.id,
      details: { titre, couverture: couvertureUrl !== null },
    });
    redirect("/admin/offres");
  }

  return (
    <>
      <Retour href="/admin/offres" label="Offres" />
      {/* L'offre est rattachée à l'ORGANISATION partenaire, pas à un compte : le jour où un
          espace partenaire existera, rien ne bougera en base. */}
      <h1 className="mb-4 text-2xl font-bold text-encre">Publier une offre</h1>

      <FormulaireOffre
        action={publier}
        retour="/admin/offres"
        partenaires={partenaires}
        erreur={erreur}
        avecCouverture={hebergeurImages() === "cloudinary"}
      />
    </>
  );
}
