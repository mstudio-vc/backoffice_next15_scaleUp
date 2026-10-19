import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { candidatures, organisations } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { Badge } from "@/components/badge";
import { CarteTable, EntetePage, TD, TH, TR, Vide } from "@/components/page-entete";
import { ExportCsv } from "@/components/export-csv";
import {
  PROGRAMME,
  STATUT_ORGANISATION,
  TON_STATUT_ORGANISATION,
  TYPE_ORGANISATION,
  TYPE_PARTENAIRE,
  programmeDe,
} from "@/lib/vocabulaire";

/**
 * Deux vues au lieu d'un bloc d'alerte.
 *
 * L'écran affichait les organisations à valider DEUX fois : dans un encart en haut, puis dans
 * la grille. Le même objet montré deux fois se lit comme deux objets, et l'encart poussait la
 * grille sous la ligne de flottaison. Une vue filtre la liste, elle ne la duplique pas.
 *
 * Aucune écriture ne part d'ici. La liste mène à la fiche, la fiche mène à la confirmation,
 * et c'est la confirmation qui écrit (règles 5 et 8).
 */
/**
 * Les vues séparent ce que le programme distingue : deux promotions, et les partenaires qui les
 * accompagnent. Un écran qui mélange 104 startups, 51 PME et 6 partenaires dans une seule liste
 * oblige à trier de tête — alors que personne ne travaille jamais sur les trois à la fois.
 */
const VUES = [
  { cle: "a-traiter", label: "À traiter" },
  { cle: "next15", label: "Next 15" },
  { cle: "scaleup", label: "Scale Up" },
  { cle: "partenaires", label: "Partenaires" },
  { cle: "doublons", label: "Doublons" },
  { cle: "toutes", label: "Toutes" },
] as const;

/** Pour rapprocher « Recruterra » et « Recruterra SARL », ou deux fois la même raison sociale. */
const cle = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Les organisations qui désignent probablement la même entreprise.
 *
 * L'import crée une organisation PAR CANDIDATURE, et c'est voulu : deux dépôts sont deux
 * dossiers, et les fondre perdrait une candidature réelle. Mais une entreprise qui a déposé
 * trois fois — Thelema l'a fait, dont une fois dans l'autre programme — apparaît trois fois
 * dans l'annuaire, et un accès ouvert sur son courriel heurterait l'unicité de `utilisateurs`.
 *
 * Le rapprochement se fait sur le courriel officiel OU la raison sociale normalisée. Il est
 * indicatif : c'est l'administration qui tranche, en refusant les dossiers surnuméraires.
 */
function grouper(lignes: (typeof organisations.$inferSelect)[]) {
  const paquets = new Map<string, typeof lignes>();
  for (const o of lignes) {
    for (const k of [
      o.emailOfficiel ? `courriel:${o.emailOfficiel.trim().toLowerCase()}` : null,
      `nom:${cle(o.denominationSociale)}`,
    ]) {
      if (!k) continue;
      const p = paquets.get(k) ?? [];
      if (!p.some((x) => x.id === o.id)) p.push(o);
      paquets.set(k, p);
    }
  }
  // Une organisation déjà rapprochée par son courriel n'est pas re-listée par son nom.
  const vus = new Set<string>();
  const groupes: { cle: string; membres: typeof lignes }[] = [];
  for (const [k, membres] of paquets) {
    if (membres.length < 2) continue;
    if (membres.every((m) => vus.has(m.id))) continue;
    membres.forEach((m) => vus.add(m.id));
    groupes.push({ cle: k.split(":").slice(1).join(":"), membres });
  }
  return groupes.sort((a, b) => b.membres.length - a.membres.length);
}

export default async function AdminOrganisations({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string }>;
}) {
  await exigerRoot();
  const { vue } = await searchParams;
  const active = VUES.find((v) => v.cle === vue) ?? VUES[0];

  const toutes = await db.select().from(organisations).orderBy(desc(organisations.creeLe));
  const enAttente = toutes.filter((o) => o.statut === "en_attente");
  const groupes = grouper(toutes);

  const parVue = {
    "a-traiter": enAttente,
    next15: toutes.filter((o) => o.type === "startup"),
    scaleup: toutes.filter((o) => o.type === "pme"),
    partenaires: toutes.filter((o) => o.type === "partenaire"),
    doublons: [] as typeof toutes,
    toutes,
  } satisfies Record<(typeof VUES)[number]["cle"], typeof toutes>;

  const lignes = parVue[active.cle];

  // Le programme et la date de dépôt : c'est ce qui permet de décider lequel garder.
  const dossiers =
    active.cle === "doublons" && groupes.length > 0
      ? await db
          .select({
            organisationId: candidatures.organisationId,
            programme: candidatures.programme,
            deposeeLe: candidatures.deposeeLe,
          })
          .from(candidatures)
          .where(
            inArray(
              candidatures.organisationId,
              groupes.flatMap((g) => g.membres.map((m) => m.id)),
            ),
          )
      : [];

  return (
    <>
      <EntetePage
        titre="Organisations"
        etat={`${toutes.length} au total · ${enAttente.length} à valider`}
        action={{ href: "/admin/organisations/nouvelle", label: "Ajouter un partenaire" }}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {VUES.map((v) => (
          <Link
            key={v.cle}
            href={`/admin/organisations?vue=${v.cle}`}
            className={`rounded px-2.5 py-1 text-base ${
              v.cle === active.cle
                ? "bg-vert font-bold text-white"
                : "text-ardoise hover:bg-papier"
            }`}
          >
            {v.label}
            <span className="ml-1.5 opacity-70">
              {v.cle === "doublons" ? groupes.length : parVue[v.cle].length}
            </span>
          </Link>
        ))}
        <span className="ml-auto">
          <ExportCsv quoi="organisations" label="Exporter les organisations" />
        </span>
      </div>

      {active.cle === "doublons" ? (
        groupes.length === 0 ? (
          <Vide titre="Aucun doublon repéré" texte="Chaque organisation est unique." />
        ) : (
          <div className="flex flex-col gap-3">
            {groupes.map((g) => (
              <section key={g.cle} className="rounded bg-white p-3 ring-1 ring-brume">
                <p className="mb-2 text-sm text-pierre">
                  {g.membres.length} dossiers · {g.cle}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {g.membres.map((m) => {
                    const ds = dossiers.filter((d) => d.organisationId === m.id);
                    return (
                      <li key={m.id} className="flex flex-wrap items-center gap-2 border-t border-brume/60 pt-1.5">
                        <Link
                          href={`/admin/organisations/${m.id}`}
                          className="font-bold text-vert hover:underline"
                        >
                          {m.denominationSociale}
                        </Link>
                        <span className="text-sm text-pierre">
                          {ds
                            .map(
                              (d) =>
                                `${PROGRAMME[d.programme]}${
                                  d.deposeeLe ? ` · ${d.deposeeLe.toLocaleDateString("fr-FR")}` : ""
                                }`,
                            )
                            .join(" / ")}
                        </span>
                        <span className="ml-auto">
                          <Badge ton={TON_STATUT_ORGANISATION[m.statut]}>
                            {STATUT_ORGANISATION[m.statut]}
                          </Badge>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )
      ) : lignes.length === 0 ? (
        <Vide
          titre={active.cle === "a-traiter" ? "Rien à valider" : "Aucune organisation"}
          texte={
            active.cle === "a-traiter" ? undefined : "Importez les lauréats, puis les partenaires."
          }
          action={
            active.cle === "a-traiter"
              ? { href: "/admin/organisations?vue=toutes", label: "Voir toutes" }
              : { href: "/admin/import", label: "Importer des lauréats" }
          }
        />
      ) : (
        <CarteTable>
          <thead>
            <tr>
              <th className={TH}>Organisation</th>
              <th className={TH}>Catégorie</th>
              <th className={TH}>Secteurs</th>
              <th className={TH}>État</th>
              <th className={`${TH} text-right`}>Fiche</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((o) => (
              <tr key={o.id} className={TR}>
                <td className={TD}>
                  {/* La ligne ouvre la fiche. On lit, puis on agit (règle 8). */}
                  <Link
                    href={`/admin/organisations/${o.id}`}
                    className="font-bold text-vert hover:underline"
                  >
                    {o.denominationSociale}
                  </Link>
                  {o.localisation ? (
                    <span className="block text-sm text-pierre">{o.localisation}</span>
                  ) : null}
                </td>
                <td className={`${TD} text-ardoise`}>
                  {/* Le programme pour un lauréat, le métier pour un partenaire : c'est ce qui
                      distingue réellement deux lignes. « Startup » les distingue à peine. */}
                  {o.type === "partenaire"
                    ? o.typePartenaire
                      ? TYPE_PARTENAIRE[o.typePartenaire]
                      : TYPE_ORGANISATION.partenaire
                    : PROGRAMME[programmeDe(o.type)!]}
                </td>
                <td className={`${TD} text-sm text-pierre`}>
                  {o.secteurs.length === 0 ? (
                    "—"
                  ) : (
                    <>
                      {o.secteurs.slice(0, 2).join(" · ")}
                      {o.secteurs.length > 2 ? ` +${o.secteurs.length - 2}` : ""}
                    </>
                  )}
                </td>
                <td className={TD}>
                  <Badge ton={TON_STATUT_ORGANISATION[o.statut]}>
                    {STATUT_ORGANISATION[o.statut]}
                  </Badge>
                </td>
                <td className={`${TD} text-right`}>
                  <Link
                    href={`/admin/organisations/${o.id}`}
                    className="text-base text-vert hover:underline"
                  >
                    Ouvrir →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </CarteTable>
      )}
    </>
  );
}
