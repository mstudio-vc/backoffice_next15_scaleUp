import Link from "next/link";

/**
 * En-tête de page : un titre, une phrase, et au plus UNE action principale.
 *
 * Les écrans de liste ne portent pas de formulaire : la création vit sur sa propre route. On
 * garde ainsi une navigation réelle — un retour arrière qui fonctionne, une URL partageable,
 * et une page qui fait une seule chose.
 */
export function EntetePage({
  titre,
  description,
  action,
}: {
  titre: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-encre">{titre}</h1>
        {description ? <p className="mt-1 text-[15px] text-ardoise">{description}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex h-11 shrink-0 items-center rounded-xl bg-vert px-5 text-[15px] font-semibold text-white transition hover:bg-vert-mid"
        >
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
      className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ardoise transition hover:text-vert"
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}

/** Carte de formulaire, de largeur lisible : un formulaire n'a pas à s'étaler. */
export function CarteFormulaire({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-vert/10 md:p-8">
      {children}
    </div>
  );
}

/** État vide d'une grille : il dit quoi faire, pas seulement qu'il n'y a rien. */
export function Vide({ texte, action }: { texte: string; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-2xl border border-dashed border-brume bg-white/60 px-6 py-12 text-center">
      <p className="text-ardoise">{texte}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-4 inline-flex h-10 items-center rounded-xl bg-vert px-4 text-sm font-semibold text-white hover:bg-vert-mid"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
