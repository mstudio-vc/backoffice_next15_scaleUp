import Link from "next/link";
import { BOUTON } from "@/components/champ";

/**
 * En-tête de page : un titre, une LIGNE D'ÉTAT, et au plus une action principale.
 *
 * La ligne d'état remplace la phrase d'explication qui s'y trouvait. Un écran de gestion n'a
 * pas à se présenter : il annonce ce qu'il contient — « 155 éléments · 104 en attente ». Un
 * chiffre sans son dénominateur ne se lit pas (règle 10), et une phrase qui explique l'écran
 * se lit une fois puis encombre tous les jours.
 */
export function EntetePage({
  titre,
  etat,
  action,
}: {
  titre: string;
  /** Effectif, et ce qui le qualifie. Compté côté serveur, jamais déduit de la page affichée. */
  etat?: string;
  action?: { href: string; label: string };
}) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-encre">{titre}</h1>
        {etat ? <p className="mt-0.5 text-sm text-pierre">{etat}</p> : null}
      </div>
      {action ? (
        <Link href={action.href} className={`${BOUTON} shrink-0`}>
          {action.label}
        </Link>
      ) : null}
    </header>
  );
}

/** Fil de retour des pages de formulaire. Il dit d'où l'on vient, et y ramène. */
export function Retour({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-3 inline-flex items-center gap-1 text-sm text-ardoise hover:text-vert"
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}

/** Carte de formulaire, de largeur lisible : un formulaire n'a pas à s'étaler. */
export function CarteFormulaire({ children }: { children: React.ReactNode }) {
  return <div className="max-w-2xl rounded bg-white p-5 ring-1 ring-brume">{children}</div>;
}

/**
 * Le cadre d'une grille de données.
 *
 * Il était recopié dans cinq écrans. Le jour où le cadre a changé, il a changé dans trois
 * d'entre eux (règle 3 : la troisième fois, c'est dans la primitive).
 */
export function CarteTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded bg-white ring-1 ring-brume">
      <table className="w-full text-base">{children}</table>
    </div>
  );
}

export const TH = "px-3 py-2 text-left text-sm font-bold text-ardoise";
export const TD = "px-3 py-2 align-middle";
export const TR = "border-t border-brume/60 hover:bg-papier/50";

/** État vide : un titre, une phrase, et l'action suivante (SLDS §7.10). */
export function Vide({
  titre,
  texte,
  action,
}: {
  titre: string;
  texte?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded border border-dashed border-brume bg-white/60 px-5 py-10 text-center">
      <p className="font-bold text-encre">{titre}</p>
      {texte ? <p className="mt-1 text-sm text-ardoise">{texte}</p> : null}
      {action ? (
        <Link href={action.href} className={`${BOUTON} mt-4`}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
