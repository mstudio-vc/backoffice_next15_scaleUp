import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organisations, utilisateurs } from "@/db/schema";
import { ouvrirAcces } from "@/lib/acces";
import { exigerRoot } from "@/lib/garde";
import { Champ, BOUTON } from "@/components/champ";
import { CarteFormulaire, Retour } from "@/components/page-entete";
import { TYPE_ORGANISATION } from "@/lib/vocabulaire";

export default async function NouvelAcces() {
  await exigerRoot();

  const orgs = await db
    .select({ id: organisations.id, nom: organisations.denominationSociale, type: organisations.type })
    .from(organisations)
    .orderBy(organisations.denominationSociale);

  async function creer(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const nom = String(formData.get("nom") ?? "").trim() || null;
    const role = formData.get("role") === "root" ? "root" : "membre";
    const organisationId = String(formData.get("organisationId") ?? "") || null;

    if (!email) return;
    if (role === "membre" && !organisationId) return;

    const [cree] = await db
      .insert(utilisateurs)
      .values({
        email,
        nom,
        role,
        organisationId: role === "root" ? null : organisationId,
        statut: "invite",
      })
      .onConflictDoNothing({ target: utilisateurs.email })
      .returning({ id: utilisateurs.id });

    // Adresse déjà connue : on renvoie un accès au compte existant plutôt que d'échouer.
    const id =
      cree?.id ??
      (await db.select({ id: utilisateurs.id }).from(utilisateurs).where(eq(utilisateurs.email, email)).limit(1))[0]
        ?.id;

    if (id) await ouvrirAcces(id, session.utilisateurId);
    redirect("/admin/acces");
  }

  const champSelect =
    "h-8 rounded border border-brume bg-white px-3.5 text-base text-encre outline-none focus:border-vert focus:ring-4 focus:ring-brume";

  return (
    <>
      <Retour href="/admin/acces" label="Accès" />
      {/* Pourquoi on ne choisit pas le mot de passe à la place de la personne : c'est la seule
          façon de rendre une connexion imputable. La raison vit ici, pas dans l'écran. */}
      <h1 className="mb-4 text-2xl font-bold text-encre">Ouvrir un accès</h1>

      <CarteFormulaire>
        {orgs.length === 0 ? (
          <p className="rounded border-l-4 border-orange bg-orange/5 px-4 py-3 text-sm text-graphite">
            Aucune organisation en base. Importez d&apos;abord les lauréats, ou ajoutez un
            partenaire depuis Organisations.
          </p>
        ) : null}

        <form action={creer} className="grid gap-5 sm:grid-cols-2">
          <Champ label="Adresse e-mail" name="email" type="email" required placeholder="prenom.nom@entreprise.ci" />
          <Champ label="Nom et prénoms" name="nom" placeholder="facultatif" />

          <label className="flex flex-col gap-1.5">
            <span className="text-base font-bold text-graphite">Type de compte</span>
            <select name="role" className={champSelect}>
              <option value="membre">Membre d&apos;une organisation</option>
              <option value="root">Administration du programme</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-base font-bold text-graphite">Organisation</span>
            <select name="organisationId" className={champSelect}>
              <option value="">— aucune (compte d&apos;administration) —</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nom} · {TYPE_ORGANISATION[o.type]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-3 sm:col-span-2">
            <button className={BOUTON}>Ouvrir l&apos;accès et envoyer le lien</button>
          </div>
        </form>
      </CarteFormulaire>
    </>
  );
}
