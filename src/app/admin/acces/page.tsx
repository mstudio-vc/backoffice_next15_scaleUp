import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organisations, utilisateurs } from "@/db/schema";
import { ouvrirAcces } from "@/lib/acces";
import { exigerRoot } from "@/lib/garde";

const LIBELLE_STATUT = {
  invite: "Accès envoyé, mot de passe à définir",
  actif: "Actif",
  suspendu: "Suspendu",
} as const;

export default async function Acces() {
  const moi = await exigerRoot();

  const [orgs, comptes] = await Promise.all([
    db
      .select({ id: organisations.id, nom: organisations.denominationSociale, programme: organisations.programme })
      .from(organisations)
      .orderBy(organisations.denominationSociale),
    db
      .select({
        id: utilisateurs.id,
        email: utilisateurs.email,
        nom: utilisateurs.nom,
        role: utilisateurs.role,
        statut: utilisateurs.statut,
        creeLe: utilisateurs.creeLe,
        organisation: organisations.denominationSociale,
        programme: organisations.programme,
      })
      .from(utilisateurs)
      .leftJoin(organisations, eq(organisations.id, utilisateurs.organisationId))
      .orderBy(desc(utilisateurs.creeLe)),
  ]);

  async function creerAcces(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const nom = String(formData.get("nom") ?? "").trim() || null;
    const role = formData.get("role") === "root" ? "root" : "membre";
    const organisationId = String(formData.get("organisationId") ?? "") || null;

    if (!email) return;
    // Un membre appartient forcément à une organisation ; un root n'en a aucune.
    if (role === "membre" && !organisationId) return;

    const [u] = await db
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
      u?.id ??
      (
        await db
          .select({ id: utilisateurs.id })
          .from(utilisateurs)
          .where(eq(utilisateurs.email, email))
          .limit(1)
      )[0]?.id;

    if (id) await ouvrirAcces(id, session.utilisateurId);
    revalidatePath("/admin/acces");
  }

  async function renvoyer(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    await ouvrirAcces(String(formData.get("utilisateurId")), session.utilisateurId);
    revalidatePath("/admin/acces");
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold">Ouvrir un accès</h1>
        <p className="mt-1 text-sm text-slate-500">
          Le compte est créé, un lien de définition de mot de passe part par courriel. Vous ne
          choisissez pas le mot de passe : l&apos;invité le définit lui-même.
        </p>

        <form action={creerAcces} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Adresse e-mail
            <input name="email" type="email" required className="h-11 rounded-lg border border-slate-300 px-3 font-normal" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Nom et prénoms
            <input name="nom" className="h-11 rounded-lg border border-slate-300 px-3 font-normal" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Type de compte
            <select name="role" className="h-11 rounded-lg border border-slate-300 px-3 font-normal">
              <option value="membre">Membre d&apos;une organisation</option>
              <option value="root">Administration du programme</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Organisation
            <select name="organisationId" className="h-11 rounded-lg border border-slate-300 px-3 font-normal">
              <option value="">— aucune (compte d&apos;administration) —</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nom} · {o.programme === "next15" ? "Next 15" : "Scale Up"}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button className="h-11 rounded-lg bg-slate-900 px-5 font-semibold text-white hover:bg-slate-800">
              Ouvrir l&apos;accès et envoyer le lien
            </button>
          </div>
        </form>

        {orgs.length === 0 ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Aucune organisation en base. Importez d&apos;abord les lauréats :{" "}
            <code className="font-mono">npm run importer:candidatures</code>
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Comptes</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="text-left text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="py-2 pr-4">Adresse</th>
                <th className="py-2 pr-4">Organisation</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">État</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {comptes.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="py-3 pr-4">
                    <span className="font-medium">{c.email}</span>
                    {c.nom ? <span className="block text-xs text-slate-500">{c.nom}</span> : null}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    {c.organisation ?? "—"}
                    {c.programme ? (
                      <span className="block text-xs text-slate-500">
                        {c.programme === "next15" ? "Next 15" : "Scale Up"}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    {c.role === "root" ? "Administration" : "Membre"}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{LIBELLE_STATUT[c.statut]}</td>
                  <td className="py-3 text-right">
                    <form action={renvoyer}>
                      <input type="hidden" name="utilisateurId" value={c.id} />
                      <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
                        Renvoyer le lien
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {comptes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Aucun compte. Le vôtre a été créé par <code className="font-mono">npm run creer:root</code>.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-500">Connecté en tant que {moi.email}.</p>
      </section>
    </div>
  );
}
