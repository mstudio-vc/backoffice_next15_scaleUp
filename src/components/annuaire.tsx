import Link from "next/link";
import { and, count, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { organisations } from "@/db/schema";
import { Badge } from "@/components/badge";
import { SAISIE } from "@/components/champ";
import { Vide } from "@/components/page-entete";
import {
  FAMILLE_PARTENAIRE,
  STATUT_ORGANISATION,
  TON_STATUT_ORGANISATION,
  TYPE_ORGANISATION,
  TYPE_PARTENAIRE,
  type FamillePartenaire,
  type TypeOrganisation,
} from "@/lib/vocabulaire";

/**
 * L'annuaire, partagé par les quatre espaces.
 *
 * Un lauréat ne voit que les organisations VALIDÉES : une fiche en attente n'a pas été
 * contrôlée par l'administration, elle n'a donc rien à faire dans un annuaire. Le root, lui,
 * voit tout — c'est son travail de valider.
 *
 * TROIS CHOSES ONT ÉTÉ CORRIGÉES ICI, et elles tenaient toutes à la même cause : la
 * description d'un lauréat vient de sa candidature, et fait 909 caractères en médiane, jusqu'à
 * 3064.
 *
 *   · elle était affichée entière, dans une carte pleine largeur, pour 161 organisations
 *     empilées en une colonne. On ne lisait rien et on ne trouvait personne ;
 *   · il n'y avait aucune recherche. Un annuaire de 161 entrées sans recherche ne sert pas ;
 *   · tout était chargé d'un coup.
 *
 * Donc : une grille de cartes de hauteur égale, la description bornée à deux lignes, le texte
 * complet sur la fiche, une recherche, et des lots de 24 (SLDS §4).
 */

const FILTRES: { cle: string; label: string; types: TypeOrganisation[] }[] = [
  { cle: "toutes", label: "Toutes", types: ["startup", "pme", "partenaire"] },
  { cle: "startups", label: "Startups", types: ["startup"] },
  { cle: "pme", label: "PME", types: ["pme"] },
  { cle: "partenaires", label: "Partenaires", types: ["partenaire"] },
];

const PAR_LOT = 24;

export async function Annuaire({
  base,
  filtre = "toutes",
  famille,
  q = "",
  n,
  toutVoir = false,
}: {
  /** Préfixe des liens, pour que l'annuaire reste dans l'espace où il est affiché. */
  base: string;
  filtre?: string;
  /** Famille de partenaires — financier, investisseur, corporate, autres. */
  famille?: string;
  q?: string;
  n?: string;
  toutVoir?: boolean;
}) {
  const choisi = FILTRES.find((f) => f.cle === filtre) ?? FILTRES[0];
  const recherche = q.trim();

  // La famille n'a de sens que sur les partenaires : filtrer des startups par « financier »
  // ne voudrait rien dire.
  const famChoisie =
    choisi.cle === "partenaires" && famille && famille in FAMILLE_PARTENAIRE
      ? (famille as FamillePartenaire)
      : null;
  const parFamille: SQL | undefined = famChoisie
    ? inArray(organisations.typePartenaire, [...FAMILLE_PARTENAIRE[famChoisie].metiers])
    : undefined;
  const limite = Math.min(Math.max(Number(n) || PAR_LOT, PAR_LOT), 500);

  const visible = toutVoir ? undefined : eq(organisations.statut, "validee");
  const cherche: SQL | undefined = recherche
    ? or(
        ilike(organisations.denominationSociale, `%${recherche}%`),
        ilike(organisations.nomCommercial, `%${recherche}%`),
        ilike(organisations.description, `%${recherche}%`),
      )
    : undefined;

  // L'effectif de CHAQUE onglet, compté en SQL. Un chiffre déduit des cartes affichées serait
  // faux dès le premier lot (règle 10).
  const [parType, [total], lignes] = await Promise.all([
    db
      .select({ type: organisations.type, n: count() })
      .from(organisations)
      .where(and(visible, cherche))
      .groupBy(organisations.type),
    db
      .select({ n: count() })
      .from(organisations)
      .where(and(visible, cherche, inArray(organisations.type, choisi.types), parFamille)),
    db
      .select()
      .from(organisations)
      .where(and(visible, cherche, inArray(organisations.type, choisi.types), parFamille))
      .orderBy(organisations.denominationSociale)
      .limit(limite),
  ]);

  // L'effectif de chaque famille, compté sur les partenaires visibles.
  const partenaires =
    choisi.cle === "partenaires"
      ? await db
          .select({ metier: organisations.typePartenaire, n: count() })
          .from(organisations)
          .where(and(visible, cherche, eq(organisations.type, "partenaire")))
          .groupBy(organisations.typePartenaire)
      : [];

  const effectifFamille = (f: FamillePartenaire) =>
    partenaires
      .filter((p) => p.metier && ([...FAMILLE_PARTENAIRE[f].metiers] as string[]).includes(p.metier))
      .reduce((s, p) => s + p.n, 0);

  const effectif = (types: TypeOrganisation[]) =>
    parType.filter((p) => types.includes(p.type)).reduce((s, p) => s + p.n, 0);

  const lien = (p: Record<string, string | undefined>, ancre?: string) => {
    const u = new URLSearchParams();
    if (p.filtre && p.filtre !== "toutes") u.set("filtre", p.filtre);
    if (p.famille) u.set("famille", p.famille);
    if (p.q) u.set("q", p.q);
    if (p.n) u.set("n", p.n);
    const s = u.toString();
    return `${s ? `${base}?${s}` : base}${ancre ? `#${ancre}` : ""}`;
  };

  /**
   * « Afficher plus » ramenait l'écran en haut : c'est une navigation, et le navigateur
   * repositionne. L'ancre est posée sur la PREMIÈRE CARTE DU NOUVEAU LOT, et le lien y mène —
   * on reprend donc la lecture là où elle s'est arrêtée.
   *
   * Pourquoi une ancre et non `scroll={false}` : celui-ci est un comportement du routeur, donc
   * sans effet quand le JavaScript n'est pas là. Toute cette application fonctionne sans, et
   * ce n'est pas la pagination de l'annuaire qui va introduire l'exception.
   */
  const indexAncre = Math.max(limite - PAR_LOT, 0);

  return (
    <div className="flex flex-col gap-3">
      <form action={base} className="flex flex-wrap items-center gap-2">
        {/* Un formulaire GET : la recherche vit dans l'adresse, donc elle se partage et
            survit à un rechargement, sans une ligne de JavaScript. */}
        <input
          type="search"
          name="q"
          defaultValue={recherche}
          placeholder="Rechercher une organisation, un secteur…"
          aria-label="Rechercher dans l'annuaire"
          className={`${SAISIE} h-8 max-w-xs`}
        />
        {choisi.cle !== "toutes" ? (
          <input type="hidden" name="filtre" value={choisi.cle} />
        ) : null}
        <button className="h-8 rounded border border-brume bg-white px-3 text-base text-vert hover:bg-papier">
          Rechercher
        </button>
        {recherche ? (
          <Link href={lien({ filtre: choisi.cle })} className="text-base text-ardoise hover:text-vert">
            Effacer
          </Link>
        ) : null}
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {FILTRES.map((f) => (
          <Link
            key={f.cle}
            href={lien({ filtre: f.cle, q: recherche })}
            className={`rounded px-2.5 py-1 text-base ${
              f.cle === choisi.cle ? "bg-vert font-bold text-white" : "text-ardoise hover:bg-papier"
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-70">{effectif(f.types)}</span>
          </Link>
        ))}
        <span className="ml-auto text-sm text-pierre">
          {lignes.length} affichée{lignes.length > 1 ? "s" : ""} sur {total.n}
        </span>
      </div>

      {/* Les familles, seulement sous l'onglet Partenaires : elles n'ont pas de sens ailleurs. */}
      {choisi.cle === "partenaires" ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm text-pierre">Famille :</span>
          <Link
            href={lien({ filtre: "partenaires", q: recherche })}
            className={`rounded px-2 py-0.5 text-sm ${
              famChoisie ? "text-ardoise hover:bg-papier" : "bg-ardoise font-bold text-white"
            }`}
          >
            Toutes
          </Link>
          {(Object.keys(FAMILLE_PARTENAIRE) as FamillePartenaire[]).map((f) => (
            <Link
              key={f}
              href={lien({ filtre: "partenaires", famille: f, q: recherche })}
              className={`rounded px-2 py-0.5 text-sm ${
                famChoisie === f ? "bg-ardoise font-bold text-white" : "text-ardoise hover:bg-papier"
              }`}
            >
              {FAMILLE_PARTENAIRE[f].label}
              <span className="ml-1 opacity-70">{effectifFamille(f)}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {lignes.length === 0 ? (
        <Vide
          titre={recherche ? `Aucun résultat pour « ${recherche} »` : "Aucune organisation"}
          texte={recherche ? "Essayez un autre mot, ou changez d'onglet." : undefined}
          action={recherche ? { href: lien({ filtre: choisi.cle }), label: "Effacer la recherche" } : undefined}
        />
      ) : (
        <>
          {/* `auto-rows-fr` : toutes les cartes d'une rangée ont la même hauteur. Sans cela,
              une description de 3000 signes déformait la rangée entière. */}
          <ul className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {lignes.map((o, i) => (
              <li key={o.id} id={i === indexAncre ? "suite" : undefined}>
                <Link
                  href={`${base}/${o.id}`}
                  className="flex h-full flex-col rounded bg-white p-3 ring-1 ring-brume hover:ring-vert"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded bg-papier text-base font-bold text-ardoise">
                      {o.denominationSociale.trim()[0]?.toUpperCase() ?? "?"}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-encre" title={o.denominationSociale}>
                        {o.denominationSociale}
                      </h3>
                      <p className="truncate text-sm text-pierre">
                        {/* Pour un partenaire, son métier est plus parlant que le mot
                            « partenaire ». */}
                        {o.type === "partenaire" && o.typePartenaire
                          ? TYPE_PARTENAIRE[o.typePartenaire]
                          : TYPE_ORGANISATION[o.type]}
                        {o.localisation ? ` · ${o.localisation}` : ""}
                      </p>
                    </div>
                    {o.statut !== "validee" ? (
                      <span className="ml-auto shrink-0">
                        <Badge ton={TON_STATUT_ORGANISATION[o.statut]}>
                          {STATUT_ORGANISATION[o.statut]}
                        </Badge>
                      </span>
                    ) : null}
                  </div>

                  {o.description ? (
                    <p className="mt-2 line-clamp-2 text-base text-graphite">{o.description}</p>
                  ) : null}

                  {o.secteurs.length > 0 ? (
                    <p className="mt-auto pt-2 text-sm text-pierre">
                      {o.secteurs.slice(0, 2).join(" · ")}
                      {o.secteurs.length > 2 ? ` +${o.secteurs.length - 2}` : ""}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>

          {total.n > lignes.length ? (
            <div className="text-center">
              <Link
                href={lien({ filtre: choisi.cle, q: recherche, n: String(limite + PAR_LOT) }, "suite")}
                className="inline-flex h-8 items-center rounded border border-brume bg-white px-4 text-base text-vert hover:bg-papier"
              >
                Afficher plus ({total.n - lignes.length} restantes)
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
