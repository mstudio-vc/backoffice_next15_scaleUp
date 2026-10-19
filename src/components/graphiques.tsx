/**
 * Les graphiques, rendus sur le SERVEUR.
 *
 * Aucune bibliothèque : Chart.js ou Recharts imposeraient un composant client et une
 * dépendance, là où cette application entière se rend sans JavaScript. Du SVG et des div
 * suffisent pour des effectifs, et ils s'impriment — ce qu'un canvas ne fait pas.
 *
 * Le TEXTE porte toujours la valeur (SLDS §9) : la couleur et la longueur ne font qu'aider.
 * Un graphique dont il faut deviner les chiffres ne vaut pas le tableau qu'il remplace.
 */

/** Les teintes de la charte, dans un ordre qui reste lisible côte à côte. */
const TEINTES = [
  "var(--vert)",
  "var(--feuille)",
  "var(--orange)",
  "var(--menthe)",
  "var(--ardoise)",
  "var(--pierre)",
];

export type Part = { label: string; valeur: number };

/**
 * Barres horizontales.
 *
 * Horizontales et non verticales : les libellés sont des noms d'entreprises et de secteurs,
 * parfois longs. À la verticale ils se chevauchent ou s'inclinent, et plus personne ne les lit.
 */
export function Barres({
  parts,
  unite = "",
  max = 6,
}: {
  parts: Part[];
  /** Mot au singulier, accordé automatiquement : « offre », « lauréat ». */
  unite?: string;
  /** Au-delà, le reste est replié en une ligne « autres ». */
  max?: number;
}) {
  const triees = [...parts].sort((a, b) => b.valeur - a.valeur);
  const visibles = triees.slice(0, max);
  const reste = triees.slice(max);

  // L'échelle part du PLUS GRAND, pas du total : comparer des barres entre elles est le but,
  // et rapporter au total écraserait tout quand une part domine.
  const sommet = Math.max(...visibles.map((v) => v.valeur), 1);

  if (visibles.every((v) => v.valeur === 0)) {
    return <p className="text-sm text-pierre">Aucune donnée à représenter.</p>;
  }

  return (
    <>
    <ul className="flex flex-col gap-2">
      {visibles.map((p, i) => (
        <li key={p.label} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3">
          <span className="truncate text-sm text-graphite" title={p.label}>
            {p.label}
          </span>
          <span className="text-sm font-bold text-encre tabular-nums">
            {p.valeur}
            {unite ? ` ${unite}${p.valeur > 1 ? "s" : ""}` : ""}
          </span>
          <span className="col-span-2 h-1.5 rounded-full bg-papier">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.max((p.valeur / sommet) * 100, p.valeur > 0 ? 2 : 0)}%`,
                background: TEINTES[i % TEINTES.length],
              }}
            />
          </span>
        </li>
      ))}
    </ul>

    {/* Le reste est COMPTÉ, pas cumulé en une barre : leur somme dépasserait le plus grand des
        secteurs affichés et écraserait l'échelle, alors qu'on vient comparer les premiers. */}
    {reste.length > 0 ? (
      <p className="mt-2 border-t border-brume pt-2 text-sm text-pierre">
        et {reste.length} autre{reste.length > 1 ? "s" : ""}, de {Math.min(...reste.map((r) => r.valeur))} à{" "}
        {Math.max(...reste.map((r) => r.valeur))}
      </p>
    ) : null}
    </>
  );
}

/**
 * Anneau de répartition.
 *
 * Un anneau et non un camembert : le trou porte le total, qui est l'information qu'on cherche
 * en premier. Au-delà de cinq parts il devient illisible — c'est `Barres` qu'il faut alors.
 */
export function Anneau({
  parts,
  total: totalForce,
  legende = true,
}: {
  parts: Part[];
  total?: number;
  legende?: boolean;
}) {
  const total = totalForce ?? parts.reduce((s, p) => s + p.valeur, 0);
  if (total === 0) return <p className="text-sm text-pierre">Aucune donnée à représenter.</p>;

  // Un cercle de rayon 16 a une circonférence de 100,53 : en l'arrondissant à 100, chaque
  // pourcentage devient directement une longueur de tiret. Pas de calcul à relire.
  const R = 16;
  const C = 2 * Math.PI * R;
  let parcouru = 0;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 40 40" className="size-28 shrink-0 -rotate-90" role="img" aria-hidden>
        <circle cx="20" cy="20" r={R} fill="none" stroke="var(--papier)" strokeWidth="7" />
        {parts.map((p, i) => {
          const longueur = (p.valeur / total) * C;
          const decalage = -parcouru;
          parcouru += longueur;
          return p.valeur === 0 ? null : (
            <circle
              key={p.label}
              cx="20"
              cy="20"
              r={R}
              fill="none"
              stroke={TEINTES[i % TEINTES.length]}
              strokeWidth="7"
              strokeDasharray={`${longueur} ${C - longueur}`}
              strokeDashoffset={decalage}
            />
          );
        })}
        <text
          x="20"
          y="20"
          className="rotate-90 fill-encre text-[7px] font-bold"
          textAnchor="middle"
          dominantBaseline="central"
          transform="rotate(90 20 20)"
        >
          {total}
        </text>
      </svg>

      {legende ? (
        <ul className="flex min-w-0 flex-col gap-1.5">
          {parts.map((p, i) => (
            <li key={p.label} className="flex items-baseline gap-2">
              <span
                aria-hidden
                className="size-2.5 shrink-0 translate-y-0.5 rounded-sm"
                style={{ background: TEINTES[i % TEINTES.length] }}
              />
              <span className="truncate text-sm text-graphite">{p.label}</span>
              <span className="ml-auto text-sm font-bold text-encre tabular-nums">{p.valeur}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Courbe d'évolution.
 *
 * Elle répond à une question qu'aucun effectif ne pose : est-ce que ça monte. Les points sont
 * reliés et l'aire est remplie — un nuage de points demanderait de reconstituer la tendance
 * soi-même.
 */
export function Courbe({ points, unite = "" }: { points: Part[]; unite?: string }) {
  if (points.length < 2) {
    return <p className="text-sm text-pierre">Pas assez de points pour tracer une évolution.</p>;
  }

  const L = 300;
  const H = 70;
  const sommet = Math.max(...points.map((p) => p.valeur), 1);
  const pas = L / (points.length - 1);
  const xy = points.map((p, i) => [i * pas, H - (p.valeur / sommet) * (H - 8)] as const);
  const ligne = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${L} ${H}`} className="h-20 w-full" preserveAspectRatio="none" role="img" aria-hidden>
        <polygon points={`0,${H} ${ligne} ${L},${H}`} fill="var(--vert)" opacity="0.1" />
        <polyline
          points={ligne}
          fill="none"
          stroke="var(--vert)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {xy.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="var(--vert)" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>

      {/* La courbe seule ne se lit pas : les extrémités et le sommet sont écrits. */}
      <figcaption className="flex justify-between text-sm text-pierre">
        <span>{points[0].label}</span>
        <span className="font-bold text-encre">
          max {sommet}
          {unite ? ` ${unite}${sommet > 1 ? "s" : ""}` : ""}
        </span>
        <span>{points[points.length - 1].label}</span>
      </figcaption>
    </figure>
  );
}

/** Le cadre d'un graphique : un titre, une précision, et de quoi agir. */
export function Carte({
  titre,
  aide,
  children,
  className = "",
}: {
  titre: string;
  aide?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded bg-white p-4 ring-1 ring-brume ${className}`}>
      <h2 className="font-bold text-encre">{titre}</h2>
      {aide ? <p className="mb-3 text-sm text-pierre">{aide}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}
