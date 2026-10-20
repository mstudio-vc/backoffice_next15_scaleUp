import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { journal, organisations } from "@/db/schema";
import { exigerSession } from "@/lib/garde";
import { BOUTON, SAISIE } from "@/components/champ";

/**
 * La fiche d'un lauréat, en modification.
 *
 * Deux familles de champs, et la frontière n'est pas cosmétique :
 *
 *   · les champs DÉCLARATIFS (dénomination, forme juridique, RCCM, NCC) viennent de la
 *     candidature, dont la dernière question est une attestation signée du représentant légal.
 *     Les laisser modifier librement viderait cette signature de son sens. Ils sont affichés,
 *     pas éditables — une correction passe par l'administration.
 *
 *   · les champs VIVANTS (contacts, site, description, secteurs) sont ceux qui se périment :
 *     un numéro change, une entreprise déménage. Ne pas les laisser corriger rendrait la fiche
 *     fausse en quelques mois, et l'annuaire avec elle.
 *
 * C'est la même distinction que celle qui sépare `candidatures` de `organisations` en base.
 */
export async function FicheLaureat({ organisationId, base }: { organisationId: string; base: string }) {
  const org = await db.query.organisations.findFirst({
    where: eq(organisations.id, organisationId),
  });
  if (!org) return <p className="text-ardoise">Organisation introuvable.</p>;

  async function enregistrer(formData: FormData) {
    "use server";
    const session = await exigerSession();
    // L'organisation vient de la SESSION, jamais du formulaire : un identifiant posté peut
    // être forgé, et rien n'empêcherait alors de corriger la fiche d'un autre lauréat.
    if (!session.organisationId) return;

    const vide = (nom: string) => String(formData.get(nom) ?? "").trim() || null;

    const secteurs = String(formData.get("secteurs") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await db
      .update(organisations)
      .set({
        nomCommercial: vide("nomCommercial"),
        description: vide("description"),
        localisation: vide("localisation"),
        adresseSiege: vide("adresseSiege"),
        telephone: vide("telephone"),
        emailOfficiel: vide("emailOfficiel"),
        siteInternet: vide("siteInternet"),
        linkedin: vide("linkedin"),
        secteurs,
        misAJourLe: new Date(),
      })
      .where(eq(organisations.id, session.organisationId));

    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      organisationId: session.organisationId,
      action: "fiche.modifiee",
    });
    revalidatePath(base);
  }

  const champ = "h-8 font-normal " + SAISIE;
  const fige: [string, string | null][] = [
    ["Dénomination sociale", org.denominationSociale],
    ["Forme juridique", org.formeJuridique],
    ["RCCM", org.rccm],
    ["Compte contribuable (NCC)", org.ncc],
  ];

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded bg-creme p-6 ring-1 ring-brume">
        <h1 className="text-lg font-bold">Identité déclarée</h1>
        <p className="mt-0.5 text-sm text-pierre">
          Candidature signée, non modifiable. Une erreur ? Écrivez à l&apos;administration.
        </p>
        <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {fige.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs tracking-wide text-pierre uppercase">{k}</dt>
              <dd className="text-sm text-encre">
                {v ?? <span className="text-pierre">non renseigné</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded bg-white p-6 ring-1 ring-brume">
        <h2 className="text-lg font-bold">Informations à jour</h2>
        <p className="mt-0.5 text-sm text-pierre">Alimente l&apos;annuaire.</p>

        <form action={enregistrer} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-base font-bold text-graphite">
            Nom commercial
            <input name="nomCommercial" defaultValue={org.nomCommercial ?? ""} className={champ} />
          </label>
          <label className="flex flex-col gap-1 text-base font-bold text-graphite">
            Localisation
            <input
              name="localisation"
              defaultValue={org.localisation ?? ""}
              placeholder="Abidjan"
              className={champ}
            />
          </label>

          <label className="flex flex-col gap-1 text-base font-bold text-graphite sm:col-span-2">
            Adresse complète du siège
            <input name="adresseSiege" defaultValue={org.adresseSiege ?? ""} className={champ} />
          </label>

          <label className="flex flex-col gap-1 text-base font-bold text-graphite">
            Téléphone
            <input name="telephone" defaultValue={org.telephone ?? ""} className={champ} />
          </label>
          <label className="flex flex-col gap-1 text-base font-bold text-graphite">
            E-mail officiel
            <input
              name="emailOfficiel"
              type="email"
              defaultValue={org.emailOfficiel ?? ""}
              className={champ}
            />
          </label>

          <label className="flex flex-col gap-1 text-base font-bold text-graphite">
            Site internet
            <input
              name="siteInternet"
              type="url"
              defaultValue={org.siteInternet ?? ""}
              placeholder="https://"
              className={champ}
            />
          </label>
          <label className="flex flex-col gap-1 text-base font-bold text-graphite">
            Page LinkedIn
            <input
              name="linkedin"
              type="url"
              defaultValue={org.linkedin ?? ""}
              placeholder="https://www.linkedin.com/company/…"
              className={champ}
            />
          </label>

          <label className="flex flex-col gap-1 text-base font-bold text-graphite sm:col-span-2">
            Description
            <span className="font-normal text-pierre">Visible dans l&apos;annuaire.</span>
            <textarea
              name="description"
              rows={3}
              defaultValue={org.description ?? ""}
              className={"p-3 font-normal " + SAISIE}
            />
          </label>

          <label className="flex flex-col gap-1 text-base font-bold text-graphite sm:col-span-2">
            Secteurs <span className="font-normal text-pierre">(séparés par des virgules)</span>
            <input
              name="secteurs"
              defaultValue={org.secteurs.join(", ")}
              placeholder="Fintech, Agritech"
              className={champ}
            />
          </label>

          <div className="sm:col-span-2">
            <button className={BOUTON}>Enregistrer</button>
            <span className="ml-3 text-sm text-pierre">
              Dernière mise à jour le {org.misAJourLe.toLocaleDateString("fr-FR")}
            </span>
          </div>
        </form>
      </section>
    </div>
  );
}
