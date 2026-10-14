import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { journal, organisations } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { Champ, BOUTON } from "@/components/champ";
import { CarteFormulaire, Retour } from "@/components/page-entete";
import { TYPE_PARTENAIRE, type TypePartenaire } from "@/lib/vocabulaire";

export default async function NouvelleOrganisation() {
  await exigerRoot();

  async function creer(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    const nom = String(formData.get("nom") ?? "").trim();
    // Un fonds n'est pas un type d'organisation mais un partenaire dont le MÉTIER est
    // l'investissement : trois rôles ont été arrêtés, et `investisseur` ne fait plus partie
    // de l'énumération des types.
    const metier = formData.get("typePartenaire") as TypePartenaire;
    if (!nom || !(metier in TYPE_PARTENAIRE)) return;

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
    redirect("/admin/organisations");
  }

  const champSelect =
    "h-8 rounded border border-brume bg-white px-3.5 text-base text-encre outline-none focus:border-vert focus:ring-4 focus:ring-brume";

  return (
    <>
      <Retour href="/admin/organisations" label="Organisations" />
      {/* Les lauréats n'arrivent jamais par ici : ils viennent de l'import des candidatures,
          avec leur dossier. Cet écran ne sert qu'aux partenaires. */}
      <h1 className="mb-4 text-2xl font-bold text-encre">Ajouter un partenaire</h1>

      <CarteFormulaire>
        <form action={creer} className="grid gap-5 sm:grid-cols-2">
          <Champ label="Nom" name="nom" required placeholder="Ecobank Côte d'Ivoire" />

          <label className="flex flex-col gap-1.5">
            <span className="text-base font-bold text-graphite">Métier</span>
            <select name="typePartenaire" className={champSelect}>
              {Object.entries(TYPE_PARTENAIRE).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>

          <Champ label="Localisation" name="localisation" placeholder="Abidjan" />
          <Champ label="Site internet" name="siteInternet" type="url" placeholder="https://" />

          <div className="sm:col-span-2">
            <Champ label="Description" name="description" placeholder="Une phrase, affichée dans l'annuaire." />
          </div>
          <div className="sm:col-span-2">
            <Champ
              label="Secteurs"
              name="secteurs"
              placeholder="Fintech, Agritech"
              aide="Séparés par des virgules. Ils s'affichent en étiquettes dans l'annuaire."
            />
          </div>

          <div className="sm:col-span-2">
            <button className={BOUTON}>Ajouter l&apos;organisation</button>
          </div>
        </form>
      </CarteFormulaire>
    </>
  );
}
