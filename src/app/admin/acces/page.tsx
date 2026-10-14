import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organisations, utilisateurs } from "@/db/schema";
import { ouvrirAcces } from "@/lib/acces";
import { exigerRoot } from "@/lib/garde";
import { Badge } from "@/components/badge";
import { CarteTable, EntetePage, TD, TH, TR, Vide } from "@/components/page-entete";
import {
  STATUT_UTILISATEUR,
  TON_STATUT_UTILISATEUR,
  TYPE_ORGANISATION,
} from "@/lib/vocabulaire";

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
        etat={`${comptes.length} compte${comptes.length > 1 ? "s" : ""} · ${
          comptes.filter((c) => c.statut === "invite").length
        } à activer`}
        action={{ href: "/admin/acces/nouveau", label: "Ouvrir un accès" }}
      />

      {comptes.length === 0 ? (
        <Vide
          titre="Aucun compte"
          action={{ href: "/admin/acces/nouveau", label: "Ouvrir le premier accès" }}
        />
      ) : (
        <CarteTable>
            <thead>
              <tr>
                <th className={TH}>Compte</th>
                <th className={TH}>Organisation</th>
                <th className={TH}>État</th>
                <th className={TH}>Dernière connexion</th>
                <th className={`${TH} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {comptes.map((c) => (
                <tr key={c.id} className={TR}>
                  <td className={TD}>
                    <span className="font-normal text-encre">{c.email}</span>
                    <span className="block text-sm text-pierre">
                      {c.nom ? `${c.nom} · ` : ""}
                      {c.role === "root" ? "Administration" : "Membre"}
                    </span>
                  </td>
                  <td className={`${TD} text-ardoise`}>
                    {c.organisation ?? "—"}
                    {c.typeOrganisation ? (
                      <span className="block text-sm text-pierre">
                        {TYPE_ORGANISATION[c.typeOrganisation]}
                      </span>
                    ) : null}
                  </td>
                  <td className={TD}>
                    <Badge ton={TON_STATUT_UTILISATEUR[c.statut]}>
                      {STATUT_UTILISATEUR[c.statut]}
                    </Badge>
                  </td>
                  <td className={`${TD} text-ardoise`}>
                    {c.derniereConnexionLe ? c.derniereConnexionLe.toLocaleDateString("fr-FR") : "jamais"}
                  </td>
                  <td className={`${TD} text-right`}>
                    <form action={renvoyer}>
                      <input type="hidden" name="utilisateurId" value={c.id} />
                      <button className="rounded border border-brume px-3 py-1.5 text-sm font-normal text-graphite transition hover:bg-papier">
                        Renvoyer le lien
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
        </CarteTable>
      )}
    </>
  );
}
