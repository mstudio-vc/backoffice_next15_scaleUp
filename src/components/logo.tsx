import Image from "next/image";

/**
 * Les verrous officiels, extraits des sites des deux programmes : ils portent le Ministère
 * ET le programme. On ne les recompose pas — un logo d'État se reprend tel quel.
 *
 * Formats larges : 7,3:1 pour Next 15, 8,6:1 pour Scale Up. `hauteur` pilote l'affichage, la
 * largeur suit.
 */
const VERROUS = {
  next15: { src: "/logo-next15.svg", ratio: 740.91 / 101.83, alt: "Ministère de la Transition Numérique et de l'Innovation Technologique · Ivoire Tech Next 15" },
  scaleup: { src: "/logo-scaleup.png", ratio: 2594 / 300, alt: "Ministère de la Transition Numérique et de l'Innovation Technologique · Ivoire Tech Scale Up" },
} as const;

export function Logo({
  programme,
  hauteur = 34,
  className,
  priority = false,
}: {
  programme: keyof typeof VERROUS;
  hauteur?: number;
  className?: string;
  priority?: boolean;
}) {
  const v = VERROUS[programme];
  return (
    <Image
      src={v.src}
      alt={v.alt}
      height={hauteur}
      width={Math.round(hauteur * v.ratio)}
      priority={priority}
      className={className}
      style={{ height: hauteur, width: "auto" }}
    />
  );
}
