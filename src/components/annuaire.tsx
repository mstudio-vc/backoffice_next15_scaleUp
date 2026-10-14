import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { organisations } from "@/db/schema";
import { TYPE_ORGANISATION, TYPE_PARTENAIRE, type TypeOrganisation } from "@/lib/vocabulaire";

const FILTRES: { cle: string; label: string; types: TypeOrganisation[] }[] = [
  { cle: "toutes", label: "Toutes", types: ["startup", "pme", "partenaire"] },
  { cle: "startups", label: "Startups", types: ["startup"] },
  { cle: "pme", label: "PME", types: ["pme"] },
  { cle: "partenaires", label: "Partenaires", types: ["partenaire"] },
];

/**
 * L'annuaire, partagé par les trois espaces.
 *
 * Un lauréat ne voit que les organisations VALIDÉES : une fiche en attente n'a pas été
 * contrôlée par l'administration, elle n'a donc rien à faire dans un annuaire. Le root, lui,
 * voit tout — c'est son travail de valider.
 */
export async function Annuaire({
  base,
  filtre = "toutes",
  toutVoir = false,
}: {
  /** Préfixe des liens, pour que l'annuaire reste dans l'espace où il est affiché. */
  base: string;
  filtre?: string;
  toutVoir?: boolean;
}) {
  const choisi = FILTRES.find((f) => f.cle === filtre) ?? FILTRES[0];

  const lignes = await db
    .select()
    .from(organisations)
    .where(
      toutVoir
        ? inArray(organisations.type, choisi.types)
        : and(inArray(organisations.type, choisi.types), eq(organisations.statut, "validee")),
    )
    .orderBy(organisations.denominationSociale);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {FILTRES.map((f) => (
          <Link
            key={f.cle}
            href={f.cle === "toutes" ? base : `${base}?filtre=${f.cle}`}
            className={
              f.cle === choisi.cle
                ? "rounded bg-vert px-3 py-1 text-base font-bold text-white"
                : "rounded bg-white px-3 py-1 text-base text-graphite ring-1 ring-brume hover:bg-papier"
            }
          >
            {f.label}
          </Link>
        ))}
        <span className="ml-auto text-sm text-pierre">
          {lignes.length} organisation{lignes.length > 1 ? "s" : ""} dans cette vue
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {lignes.map((o) => (
          <article
            key={o.id}
            className="flex flex-wrap items-start gap-4 rounded bg-white p-5 ring-1 ring-brume"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded bg-papier text-lg font-bold text-pierre">
              {o.denominationSociale.trim()[0]?.toUpperCase() ?? "?"}
            </span>
            <div className="min-w-0 grow">
              <h3 className="font-bold">{o.denominationSociale}</h3>
              <p className="text-sm text-pierre">
                {/* Pour un partenaire, son métier est plus parlant que le mot « partenaire ». */}
                {o.type === "partenaire" && o.typePartenaire
                  ? TYPE_PARTENAIRE[o.typePartenaire]
                  : TYPE_ORGANISATION[o.type]}
                {o.localisation ? ` · ${o.localisation}` : ""}
                {o.statut !== "validee" ? ` · ${o.statut === "en_attente" ? "en attente" : "suspendue"}` : ""}
              </p>
              {o.description ? (
                <p className="mt-2 text-sm text-graphite">{o.description}</p>
              ) : null}
              {o.secteurs.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {o.secteurs.map((s) => (
                    <li key={s} className="rounded bg-white px-2 py-0.5 text-sm text-graphite ring-1 ring-brume">
                      {s}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {o.siteInternet ? (
              <a
                href={o.siteInternet}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded px-3 py-1.5 text-sm font-normal text-graphite ring-1 ring-brume hover:bg-creme"
              >
                Site
              </a>
            ) : null}
          </article>
        ))}
        {lignes.length === 0 ? (
          <p className="rounded bg-white p-6 text-center text-pierre ring-1 ring-brume">
            Aucune organisation dans cette vue.
          </p>
        ) : null}
      </div>
    </div>
  );
}
