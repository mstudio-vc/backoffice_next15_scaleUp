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
                ? "rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white"
                : "rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-white"
            }
          >
            {f.label}
          </Link>
        ))}
        <span className="ml-auto text-sm text-slate-500">
          {lignes.length} organisation{lignes.length > 1 ? "s" : ""} dans cette vue
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {lignes.map((o) => (
          <article
            key={o.id}
            className="flex flex-wrap items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-lg font-bold text-slate-500">
              {o.denominationSociale.trim()[0]?.toUpperCase() ?? "?"}
            </span>
            <div className="min-w-0 grow">
              <h3 className="font-semibold">{o.denominationSociale}</h3>
              <p className="text-sm text-slate-500">
                {/* Pour un partenaire, son métier est plus parlant que le mot « partenaire ». */}
                {o.type === "partenaire" && o.typePartenaire
                  ? TYPE_PARTENAIRE[o.typePartenaire]
                  : TYPE_ORGANISATION[o.type]}
                {o.localisation ? ` · ${o.localisation}` : ""}
                {o.statut !== "validee" ? ` · ${o.statut === "en_attente" ? "en attente" : "suspendue"}` : ""}
              </p>
              {o.description ? (
                <p className="mt-2 text-sm text-slate-700">{o.description}</p>
              ) : null}
              {o.secteurs.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {o.secteurs.map((s) => (
                    <li key={s} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800">
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
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
              >
                Site
              </a>
            ) : null}
          </article>
        ))}
        {lignes.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
            Aucune organisation dans cette vue.
          </p>
        ) : null}
      </div>
    </div>
  );
}
