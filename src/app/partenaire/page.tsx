import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { journal, organisations } from "@/db/schema";
import { exigerPartenaire } from "@/lib/garde";
import { TYPE_PARTENAIRE, type TypePartenaire } from "@/lib/vocabulaire";

/**
 * Le profil d'un partenaire.
 *
 * C'est ici qu'il déclare son MÉTIER — fonds, banque, industriel… Ce choix n'est pas cosmétique :
 * il distingue un capital-risqueur d'un prestataire sans en faire deux rôles, là où la version
 * précédente du modèle faisait de l'investisseur un type d'organisation à part.
 */
export default async function PartenaireProfil() {
  const s = await exigerPartenaire();

  const org = await db.query.organisations.findFirst({
    where: eq(organisations.id, s.organisationId!),
  });
  if (!org) return <p className="text-slate-600">Organisation introuvable.</p>;

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

  const champ = "h-11 rounded-lg border border-slate-300 px-3 font-normal";

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-xl font-semibold">{org.denominationSociale}</h1>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {org.statut === "validee" ? "validé" : org.statut === "en_attente" ? "en attente" : "suspendu"}
          </span>
        </div>
        {org.statut !== "validee" ? (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
            Tant que le Ministère n&apos;a pas validé votre compte, vos offres ne sont pas
            visibles par les lauréats et vous n&apos;apparaissez pas dans l&apos;annuaire.
          </p>
        ) : null}

        <form action={enregistrer} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Type de partenaire
            <select name="typePartenaire" defaultValue={org.typePartenaire ?? "autre"} className={champ}>
              {Object.entries(TYPE_PARTENAIRE).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Localisation
            <input name="localisation" defaultValue={org.localisation ?? ""} placeholder="Abidjan" className={champ} />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Téléphone
            <input name="telephone" defaultValue={org.telephone ?? ""} className={champ} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            E-mail officiel
            <input name="emailOfficiel" type="email" defaultValue={org.emailOfficiel ?? ""} className={champ} />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Site internet
            <input name="siteInternet" type="url" defaultValue={org.siteInternet ?? ""} placeholder="https://" className={champ} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Page LinkedIn
            <input name="linkedin" type="url" defaultValue={org.linkedin ?? ""} className={champ} />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Description
            <span className="font-normal text-slate-500">
              Visible dans l&apos;annuaire par les lauréats.
            </span>
            <textarea
              name="description"
              rows={3}
              defaultValue={org.description ?? ""}
              className="rounded-lg border border-slate-300 p-3 font-normal"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Secteurs d&apos;intérêt <span className="font-normal text-slate-500">(séparés par des virgules)</span>
            <input name="secteurs" defaultValue={org.secteurs.join(", ")} placeholder="Fintech, Agritech" className={champ} />
          </label>

          <div className="sm:col-span-2">
            <button className="h-11 rounded-lg bg-slate-900 px-5 font-semibold text-white hover:bg-slate-800">
              Enregistrer
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
