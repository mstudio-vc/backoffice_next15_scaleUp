import Link from "next/link";
import { revalidatePath } from "next/cache";
import { and, count, desc, eq, max } from "drizzle-orm";
import { db } from "@/db/client";
import { journal, organisations, utilisateurs } from "@/db/schema";
import { ouvrirAcces } from "@/lib/acces";
import { exigerRoot } from "@/lib/garde";
import { Badge } from "@/components/badge";
import { CarteTable, EntetePage, TD, TH, TR, Vide } from "@/components/page-entete";
import { ExportCsv } from "@/components/export-csv";
import {
  STATUT_UTILISATEUR,
  TON_STATUT_UTILISATEUR,
  TYPE_ORGANISATION,
  libelleAction,
} from "@/lib/vocabulaire";

/**
 * Les comptes et ce qu'ils font, sur un seul écran.
 *
 * « Accès » et « Journal » étaient deux onglets, et chacun ne répondait qu'à la moitié d'une
 * question. L'un disait qui PEUT agir, l'autre ce qui A ÉTÉ fait — mais sans dire par qui on
 * pouvait le retrouver. Pour savoir si un compte ouvert sert à quelque chose, il fallait lire
 * une liste, retenir un courriel, passer à l'autre onglet et le chercher à l'œil.
 *
 * Réunis, les deux s'éclairent : la liste des comptes porte l'activité de chacun, et chaque
 * ligne ouvre sa propre trace. « Dernière connexion » disait qu'on avait ouvert la porte ;
 * « 12 actions » dit qu'on a travaillé.
 */
const VUES = [
  { cle: "comptes", label: "Comptes" },
  { cle: "activite", label: "Activité" },
] as const;

const EXPORTS = [
  ["organisations", "Organisations"],
  ["utilisateurs", "Comptes"],
  ["offres", "Offres"],
  ["demandes", "Demandes"],
  ["documents", "Documents"],
  ["journal", "Journal"],
] as const;

export default async function Acces({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; qui?: string }>;
}) {
  await exigerRoot();
  const { vue, qui } = await searchParams;
  const active = VUES.find((v) => v.cle === vue) ?? VUES[0];

  const [comptes, activite] = await Promise.all([
    db
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
      .orderBy(desc(utilisateurs.creeLe)),

    // Une seule passe pour tout le monde : interroger le journal compte par compte ferait
    // autant de requêtes que de lignes affichées.
    db
      .select({
        utilisateurId: journal.utilisateurId,
        actions: count(),
        derniere: max(journal.creeLe),
      })
      .from(journal)
      .groupBy(journal.utilisateurId),
  ]);

  const parCompte = new Map(activite.map((a) => [a.utilisateurId, a]));

  // Les 200 derniers évènements : un journal se consulte par la fin, et une page n'a pas à
  // charger une table qui grandit sans fin.
  const evenements =
    active.cle === "activite"
      ? await db
          .select({
            id: journal.id,
            action: journal.action,
            cible: journal.cible,
            creeLe: journal.creeLe,
            auteurId: journal.utilisateurId,
            auteur: utilisateurs.email,
            organisation: organisations.denominationSociale,
          })
          .from(journal)
          .leftJoin(utilisateurs, eq(utilisateurs.id, journal.utilisateurId))
          .leftJoin(organisations, eq(organisations.id, journal.organisationId))
          .where(qui ? eq(journal.utilisateurId, qui) : undefined)
          .orderBy(desc(journal.creeLe))
          .limit(200)
      : [];

  const cible = qui ? comptes.find((c) => c.id === qui) : null;

  async function renvoyer(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    await ouvrirAcces(String(formData.get("utilisateurId")), session.utilisateurId);
    revalidatePath("/admin/acces");
  }

  const aActiver = comptes.filter((c) => c.statut === "invite").length;
  const totalActions = activite.reduce((n, a) => n + Number(a.actions), 0);

  return (
    <>
      <EntetePage
        titre="Comptes et activité"
        etat={
          active.cle === "comptes"
            ? `${comptes.length} compte${comptes.length > 1 ? "s" : ""} · ${aActiver} à activer`
            : cible
              ? `Trace de ${cible.email}`
              : `${totalActions} évènement${totalActions > 1 ? "s" : ""} · les 200 derniers affichés`
        }
        action={{ href: "/admin/acces/nouveau", label: "Ouvrir un accès" }}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {VUES.map((v) => (
          <Link
            key={v.cle}
            href={`/admin/acces?vue=${v.cle}`}
            className={`rounded px-2.5 py-1 text-base ${
              v.cle === active.cle
                ? "bg-vert font-bold text-white"
                : "text-ardoise hover:bg-papier"
            }`}
          >
            {v.label}
            <span className="ml-1.5 opacity-70">
              {v.cle === "comptes" ? comptes.length : totalActions}
            </span>
          </Link>
        ))}
        {cible ? (
          <Link
            href="/admin/acces?vue=activite"
            className="rounded border border-brume bg-white px-2.5 py-1 text-sm text-graphite hover:bg-papier"
          >
            {cible.email} ✕
          </Link>
        ) : null}
        <span className="ml-auto">
          <ExportCsv quoi={active.cle === "comptes" ? "utilisateurs" : "journal"} />
        </span>
      </div>

      {active.cle === "comptes" ? (
        comptes.length === 0 ? (
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
                <th className={TH}>Activité</th>
                <th className={`${TH} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {comptes.map((c) => {
                const a = parCompte.get(c.id);
                return (
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
                    <td className={TD}>
                      {a ? (
                        <Link
                          href={`/admin/acces?vue=activite&qui=${c.id}`}
                          className="text-vert hover:underline"
                        >
                          {Number(a.actions)} action{Number(a.actions) > 1 ? "s" : ""}
                        </Link>
                      ) : (
                        <span className="text-pierre">aucune</span>
                      )}
                      <span className="block text-sm text-pierre">
                        {a?.derniere
                          ? `dernière le ${a.derniere.toLocaleDateString("fr-FR")}`
                          : c.derniereConnexionLe
                            ? `connecté le ${c.derniereConnexionLe.toLocaleDateString("fr-FR")}`
                            : "jamais connecté"}
                      </span>
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
                );
              })}
            </tbody>
          </CarteTable>
        )
      ) : (
        <>
          {evenements.length === 0 ? (
            <Vide
              titre={cible ? "Ce compte n'a rien fait" : "Rien encore"}
              texte={cible ? "Aucune action enregistrée à son nom." : undefined}
              action={
                cible ? { href: "/admin/acces?vue=activite", label: "Voir toute l'activité" } : undefined
              }
            />
          ) : (
            <CarteTable>
              <thead>
                <tr>
                  <th className={TH}>Quand</th>
                  <th className={TH}>Qui</th>
                  <th className={TH}>Action</th>
                  <th className={TH}>Cible</th>
                </tr>
              </thead>
              <tbody>
                {evenements.map((e) => (
                  <tr key={e.id} className={TR}>
                    <td className={`${TD} whitespace-nowrap text-ardoise tabular-nums`}>
                      {e.creeLe.toLocaleString("fr-FR")}
                    </td>
                    <td className={TD}>
                      {e.auteurId && e.auteur ? (
                        <Link
                          href={`/admin/acces?vue=activite&qui=${e.auteurId}`}
                          className="text-vert hover:underline"
                        >
                          {e.auteur}
                        </Link>
                      ) : (
                        <span className="text-pierre">système</span>
                      )}
                    </td>
                    <td className={`${TD} font-normal text-encre`}>{libelleAction(e.action)}</td>
                    <td className={`${TD} text-ardoise`}>{e.cible ?? e.organisation ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </CarteTable>
          )}

          {/* Les exports vivaient sur l'ancien onglet Journal. Ils restent ici : préparer un
              comité et relire ce qui s'est passé sont le même geste. */}
          <section className="mt-4 rounded bg-white p-4 ring-1 ring-brume">
            <h2 className="text-base font-bold text-encre">Exporter les données</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXPORTS.map(([cle, label]) => (
                <ExportCsv key={cle} quoi={cle} label={label} />
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
