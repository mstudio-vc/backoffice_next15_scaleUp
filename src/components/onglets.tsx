"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * La barre d'onglets de l'espace, avec l'onglet ACTIF souligné (SLDS §2).
 *
 * Elle ne l'indiquait pas : les six onglets étaient identiques, et rien ne disait où l'on se
 * trouvait. On s'oriente alors en relisant le titre de la page, c'est-à-dire en travaillant
 * pour l'interface au lieu du contraire.
 *
 * C'est le seul composant client de l'application, et pour une raison qui ne se contourne
 * pas : le chemin courant n'est pas connu d'un gabarit rendu sur le serveur.
 */
export function Onglets({ nav }: { nav: { href: string; label: string }[] }) {
  const chemin = usePathname();

  // Le préfixe le PLUS LONG qui corresponde. Sans cela, l'onglet racine de l'espace — « Vue
  // d'ensemble », sur /admin — s'allume en même temps que tous les autres, puisque chaque
  // chemin commence par le sien : deux onglets actifs n'orientent personne.
  const actifHref = nav
    .filter((n) => chemin === n.href || chemin.startsWith(`${n.href}/`))
    .reduce<string | null>((a, n) => (a === null || n.href.length > a.length ? n.href : a), null);

  return (
    <nav className="bg-vert">
      <div className="mx-auto flex max-w-6xl gap-0.5 overflow-x-auto px-4">
        {nav.map((n) => {
          // Actif sur l'onglet ET sur ses sous-pages : le formulaire de création appartient à
          // l'onglet depuis lequel on y est entré.
          const actif = n.href === actifHref;
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={actif ? "page" : undefined}
              className={`shrink-0 border-b-[3px] px-3 py-2.5 text-base whitespace-nowrap transition ${
                actif
                  ? "border-white font-bold text-white"
                  : "border-transparent text-white/75 hover:border-white/40 hover:text-white"
              }`}
            >
              {n.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
