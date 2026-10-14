import Link from "next/link";
import { Logo } from "@/components/logo";
import { fermerSession } from "@/lib/auth/session";

/**
 * Le cadre des trois espaces.
 *
 * Le verrou officiel — Ministère et programme — est posé en haut, sur fond clair : c'est pour
 * un fond clair qu'il est dessiné. La barre de navigation, elle, porte le vert.
 *
 * Les trois espaces partagent cette ossature mais pas leur teinte vive : vert feuille pour
 * Next 15, menthe pour Scale Up, orange pour l'administration. On sait où l'on est sans lire.
 */
export function EspaceLayout({
  programme,
  sousTitre,
  teinte,
  nav,
  identite,
  role,
  children,
}: {
  /** `null` pour l'administration, qui chapeaute les deux programmes. */
  programme: "next15" | "scaleup" | null;
  sousTitre: string;
  /** Classe Tailwind de la teinte vive de l'espace. */
  teinte: string;
  nav: { href: string; label: string }[];
  identite: string;
  role: string;
  children: React.ReactNode;
}) {
  async function deconnexion() {
    "use server";
    await fermerSession();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="filet-programme h-1.5" />

      <header className="border-b border-vert/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-3.5">
          <Link href={nav[0]?.href ?? "/"} className="flex items-center gap-3">
            {programme ? (
              <Logo programme={programme} hauteur={30} priority />
            ) : (
              <span className="flex items-center gap-2.5">
                <Logo programme="next15" hauteur={22} priority />
                <span className="h-5 w-px bg-brume" />
                <Logo programme="scaleup" hauteur={18} priority />
              </span>
            )}
          </Link>

          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${teinte}`}>
            {sousTitre}
          </span>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block max-w-[14rem] truncate text-sm font-medium text-encre">
                {identite}
              </span>
              <span className="block text-xs text-pierre">{role}</span>
            </span>
            <form action={deconnexion}>
              <button className="rounded-lg border border-brume px-3 py-1.5 text-sm font-medium text-graphite transition hover:bg-papier">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <nav className="bg-vert">
        <div className="mx-auto flex max-w-6xl gap-0.5 overflow-x-auto px-4">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="shrink-0 border-b-[3px] border-transparent px-4 py-3 text-sm font-medium whitespace-nowrap text-white/80 transition hover:border-white/40 hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl grow px-6 py-8">{children}</main>

      <footer className="border-t border-vert/10 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5 text-xs text-pierre">
          Ministère de la Transition Numérique et de l&apos;Innovation Technologique ·
          Programmes Ivoire Tech Next 15 et Scale Up
        </div>
      </footer>
    </div>
  );
}
