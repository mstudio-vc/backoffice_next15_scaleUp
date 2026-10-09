import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organisations, utilisateurs } from "@/db/schema";
import { ouvrirAcces } from "@/lib/acces";
import { exigerRoot } from "@/lib/garde";
import { EntetePage, Vide } from "@/components/page-entete";
import { TYPE_ORGANISATION } from "@/lib/vocabulaire";

const LIBELLE_STATUT = {
  invite: "Lien envoyé, mot de passe à définir",
  actif: "Actif",
  suspendu: "Suspendu",
} as const;

const PASTILLE = {
  invite: "bg-orange/15 text-orange-sombre",
  actif: "bg-feuille/15 text-vert",
  suspendu: "bg-papier text-pierre",
} as const;

// Cette page ne fait qu'une chose : lister. L'ouverture d'un accès vit sur sa propre route.
export default async function Acces() {
  await exigerRoot();

  const comptes = await db
    .select({
      id: utilisateurs.id,
      email: utilisateurs.email,
      nom: utilisateurs.nom,
      role: utilisateurs.role,
      statut: utilisateurs.statut,
      derniereConnexionLe: utilisateurs.derniereConnexionLe,
      organisation: organisations.denominationSociale,
      typeOrganisation: organisations.type,
    })
    .from(utilisateurs)
    .leftJoin(organisations, eq(organisations.id, utilisateurs.organisationId))
    .orderBy(desc(utilisateurs.creeLe));

  async function renvoyer(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    await ouvrirAcces(String(formData.get("utilisateurId")), session.utilisateurId);
    revalidatePath("/admin/acces");
  }

  return (
    <>
      <EntetePage
        titre="Accès"
        description="Les comptes de la plateforme. Personne ne s'inscrit : chaque accès est ouvert ici."
        action={{ href: "/admin/acces/nouveau", label: "Ouvrir un accès" }}
      />

      {comptes.length === 0 ? (
        <Vide
          texte="Aucun compte pour le moment."
          action={{ href: "/admin/acces/nouveau", label: "Ouvrir le premier accès" }}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-vert/10">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="border-b border-vert/10 text-left text-[11px] tracking-wide text-pierre uppercase">
              <tr>
                <th className="px-5 py-3">Compte</th>
                <th className="px-5 py-3">Organisation</th>
                <th className="px-5 py-3">État</th>
                <th className="px-5 py-3">Dernière connexion</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {comptes.map((c) => (
                <tr key={c.id} className="border-b border-vert/5 last:border-0 hover:bg-papier/60">
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-encre">{c.email}</span>
                    <span className="block text-xs text-pierre">
                      {c.nom ? `${c.nom} · ` : ""}
                      {c.role === "root" ? "Administration" : "Membre"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-ardoise">
                    {c.organisation ?? "—"}
                    {c.typeOrganisation ? (
                      <span className="block text-xs text-pierre">
                        {TYPE_ORGANISATION[c.typeOrganisation]}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PASTILLE[c.statut]}`}>
                      {LIBELLE_STATUT[c.statut]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-ardoise">
                    {c.derniereConnexionLe ? c.derniereConnexionLe.toLocaleDateString("fr-FR") : "jamais"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <form action={renvoyer}>
                      <input type="hidden" name="utilisateurId" value={c.id} />
                      <button className="rounded-lg border border-brume px-3 py-1.5 text-sm font-medium text-graphite transition hover:bg-papier">
                        Renvoyer le lien
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
