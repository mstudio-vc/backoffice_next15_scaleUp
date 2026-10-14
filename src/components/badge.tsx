/**
 * Badge de statut : fond plein, texte gras de 12 px, sans point (SLDS §7.5).
 *
 * Il était recopié à la main dans huit écrans, chacun avec sa teinte claire et son arrondi.
 * Un statut qui change de couleur d'un écran à l'autre se lit comme un statut différent.
 *
 * Le TEXTE porte toujours le sens : la couleur seule ne suffit jamais (SLDS §9, accessibilité).
 */
export type TonBadge = "attente" | "succes" | "alerte" | "erreur" | "inactif" | "info";

const TON: Record<TonBadge, string> = {
  attente: "bg-papier text-graphite",
  succes: "bg-vert text-white",
  alerte: "bg-orange text-encre",
  erreur: "bg-orange-sombre text-white",
  inactif: "bg-pierre text-white",
  info: "bg-white text-encre ring-1 ring-brume",
};

export function Badge({ ton = "info", children }: { ton?: TonBadge; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-sm font-bold whitespace-nowrap ${TON[ton]}`}
    >
      {children}
    </span>
  );
}

/**
 * Pilule : une catégorie, un secteur, une cible, un filtre — jamais un statut.
 *
 * Rectangulaire et à rayon 4 px, là où le badge est plein et arrondi (SLDS §7.6). Les deux
 * étaient confondus : une catégorie peinte comme un statut se lit comme un statut, et l'œil
 * cherche un sens là où il n'y en a pas.
 */
export function Pilule({
  choisie,
  children,
}: {
  choisie?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-sm whitespace-nowrap ${
        choisie ? "bg-vert font-bold text-white" : "bg-white text-graphite ring-1 ring-brume"
      }`}
    >
      {children}
    </span>
  );
}
