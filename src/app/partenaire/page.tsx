import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { journal, organisations } from "@/db/schema";
import { exigerPartenaire } from "@/lib/garde";
import { Champ, BOUTON } from "@/components/champ";
import { EntetePage } from "@/components/page-entete";
import { TYPE_PARTENAIRE, type TypePartenaire } from "@/lib/vocabulaire";

/**
 * Le profil d'un partenaire.
 *
 * C'est ici qu'il déclare son MÉTIER — fonds, banque, industriel… Ce choix n'est pas cosmétique :
 * il distingue un capital-risqueur d'un prestataire sans en faire deux rôles, là où le modèle
 * précédent faisait de l'investisseur un type d'organisation à part.
 */
export default async function PartenaireProfil() {
  const s = await exigerPartenaire();

  const org = await db.query.organisations.findFirst({
    where: eq(organisations.id, s.organisationId!),
  });
  if (!org) return <p className="text-ardoise">Organisation introuvable.</p>;

  async function enregistrer(formData: FormData) {
    "use server";
    // L'organisation vient de la session : un identifiant posté peut être forgé.
    const session = await exigerPartenaire();
    const vide = (nom: string) => String(formData.get(nom) ?? "").trim() || null;

    const metier = formData.get("typePartenaire") as TypePartenaire;
    if (!(metier in TYPE_PARTENAIRE)) return;

    const secteurs = String(formData.get("secteurs") ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    await db
      .update(organisations)
      .set({
        typePartenaire: metier,
        description: vide("description"),
        localisation: vide("localisation"),
        telephone: vide("telephone"),
        emailOfficiel: vide("emailOfficiel"),
        siteInternet: vide("siteInternet"),
        linkedin: vide("linkedin"),
        secteurs,
        misAJourLe: new Date(),
      })
      .where(eq(organisations.id, session.organisationId!));

    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      organisationId: session.organisationId,
      action: "profil.modifie",
      details: { typePartenaire: metier },
    });
    revalidatePath("/partenaire");
  }

  const champSelect =
    "h-11 rounded-xl border border-brume bg-white px-3.5 text-[15px] text-encre outline-none focus:border-vert focus:ring-4 focus:ring-vert/10";

  return (
    <>
      <EntetePage
        titre={org.denominationSociale}
        description="Ce que vous renseignez ici alimente l'annuaire, consulté par les lauréats des deux programmes."
      />

      {org.statut !== "validee" ? (
        <p className="mb-6 rounded-xl border-l-4 border-orange bg-orange/5 px-4 py-3 text-sm text-graphite">
          Tant que le Ministère n&apos;a pas validé votre compte, vos offres ne sont pas visibles
          par les lauréats et vous n&apos;apparaissez pas dans l&apos;annuaire.
        </p>
      ) : null}

      <div className="max-w-3xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-vert/10 md:p-8">
        <form action={enregistrer} className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-graphite">Métier</span>
            <select
              name="typePartenaire"
              defaultValue={org.typePartenaire ?? "autre"}
              className={champSelect}
            >
              {Object.entries(TYPE_PARTENAIRE).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>

          <Champ label="Localisation" name="localisation" defaultValue={org.localisation ?? ""} placeholder="Abidjan" />
          <Champ label="Téléphone" name="telephone" defaultValue={org.telephone ?? ""} />
          <Champ label="E-mail officiel" name="emailOfficiel" type="email" defaultValue={org.emailOfficiel ?? ""} />
          <Champ label="Site internet" name="siteInternet" type="url" defaultValue={org.siteInternet ?? ""} placeholder="https://" />
          <Champ label="Page LinkedIn" name="linkedin" type="url" defaultValue={org.linkedin ?? ""} />

          <div className="sm:col-span-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-graphite">Description</span>
              <textarea
                name="description"
                rows={3}
                defaultValue={org.description ?? ""}
                className="rounded-xl border border-brume bg-white p-3.5 text-[15px] text-encre outline-none focus:border-vert focus:ring-4 focus:ring-vert/10"
              />
              <span className="text-xs text-pierre">Une phrase, affichée dans l&apos;annuaire.</span>
            </label>
          </div>

          <div className="sm:col-span-2">
            <Champ
              label="Secteurs d'intérêt"
              name="secteurs"
              defaultValue={org.secteurs.join(", ")}
              placeholder="Fintech, Agritech"
              aide="Séparés par des virgules. Ils s'affichent en étiquettes dans l'annuaire."
            />
          </div>

          <div className="sm:col-span-2">
            <button className={BOUTON}>Enregistrer</button>
          </div>
        </form>
      </div>
    </>
  );
}
