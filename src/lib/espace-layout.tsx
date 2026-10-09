import Link from "next/link";
import { fermerSession } from "@/lib/auth/session";

/**
 * Le cadre commun aux espaces lauréats. Les trois espaces ont des layouts DISTINCTS — couleurs,
 * intitulés, navigation — mais partagent cette ossature pour que les différences restent des
 * différences voulues, et non des divergences accumulées.
 */
export function EspaceLayout({
  titre,
  sousTitre,
  accent,
  nav,
  identite,
  children,
}: {
  titre: string;
  sousTitre: string;
  /** Classes Tailwind de la bande d'en-tête : c'est elle qui distingue les espaces à l'œil. */
  accent: string;
  nav: { href: string; label: string }[];
  identite: string;
  children: React.ReactNode;
}) {
  async function deconnexion() {
    "use server";
    await fermerSession();
  }

  return (
    <div className="min-h-screen">
      <header className={`${accent} text-white`}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
          <div className="min-w-0 grow">
            <p className="truncate text-lg font-semibold">{titre}</p>
            <p className="truncate text-sm text-white/75">{sousTitre}</p>
          </div>
          <span className="truncate text-sm text-white/85">{identite}</span>
          <form action={deconnexion}>
            <button className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium hover:bg-white/25">
              Déconnexion
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-t-lg px-4 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
