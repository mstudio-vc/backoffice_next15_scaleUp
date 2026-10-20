import Link from "next/link";
import { BOUTON_CLAIR } from "@/components/champ";
import { Onglets } from "@/components/onglets";
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
  nav,
  identite,
  role,
  children,
}: {
  /** `null` pour l'administration, qui chapeaute les deux programmes. */
  programme: "next15" | "scaleup" | null;
  sousTitre: string;
  /** Classe Tailwind de la teinte vive de l'espace. */
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

      <header className="border-b border-brume bg-white">
        {/* Le verrou officiel était posé à 30 px de haut, et à 18 px dans l'administration.
            Ces logos font 7,3:1 et 8,6:1 : à cette hauteur, le nom du Ministère qu'ils portent
            n'est plus lisible, et une marque d'État illisible ne marque rien. */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-3">
          <Link href={nav[0]?.href ?? "/"} className="flex items-center gap-3">
            {programme ? (
              <Logo programme={programme} hauteur={46} priority />
            ) : (
              <span className="flex flex-wrap items-center gap-3">
                <Logo programme="next15" hauteur={34} priority />
                <span className="h-7 w-px bg-brume" />
                <Logo programme="scaleup" hauteur={28} priority />
              </span>
            )}
          </Link>

          <span className="text-base font-bold text-graphite">{sousTitre}</span>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block max-w-[14rem] truncate text-sm font-normal text-encre">
                {identite}
              </span>
              <span className="block text-xs text-pierre">{role}</span>
            </span>
            <form action={deconnexion}>
              <button className={BOUTON_CLAIR}>Déconnexion</button>
            </form>
          </div>
        </div>
      </header>

      <Onglets nav={nav} />

      <main className="mx-auto w-full max-w-6xl grow px-6 py-5">{children}</main>

      <footer className="border-t border-brume bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5 text-xs text-pierre">
          Ministère de la Transition Numérique et de l&apos;Innovation Technologique ·
          Programmes Ivoire Tech Next 15 et Scale Up
        </div>
      </footer>
    </div>
  );
}
