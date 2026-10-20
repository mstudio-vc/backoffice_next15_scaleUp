import { count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organisations } from "@/db/schema";
import { Logo } from "@/components/logo";

/**
 * Coquille des écrans d'accès : la marque à gauche, le formulaire à droite.
 *
 * Les deux verrous sont posés sur du crème et non sur le vert : ils sont dessinés pour fond
 * clair — sur un aplat sombre, ils disparaîtraient. Ils occupaient 38 et 30 pixels de haut,
 * pour des formats 7,3:1 et 8,6:1 : le nom du Ministère qu'ils portent n'y était pas lisible.
 *
 * Les trois chiffres étaient ÉCRITS EN DUR — « 104 », « 51 », « 2 ». Ils sont restés justes
 * par hasard, le temps que le portefeuille ne bouge pas ; ils seraient devenus faux au premier
 * import, sur la page que tout le monde voit en premier. Ils sont comptés.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [[startups], [pme]] = await Promise.all([
    db.select({ n: count() }).from(organisations).where(eq(organisations.type, "startup")),
    db.select({ n: count() }).from(organisations).where(eq(organisations.type, "pme")),
  ]);

  const chiffres: [number, string][] = [
    [startups.n, "startups"],
    [pme.n, "PME"],
    [2, "programmes"],
  ];

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-4xl overflow-hidden rounded bg-white ring-1 ring-brume">
        <div className="filet-programme h-1.5" />

        <div className="grid md:grid-cols-[1.05fr_1fr]">
          <aside className="flex flex-col gap-7 bg-creme p-8 md:p-10">
            <div className="flex flex-col gap-5">
              <Logo programme="next15" hauteur={52} priority />
              <div className="h-px bg-brume/60" />
              <Logo programme="scaleup" hauteur={42} priority />
            </div>

            <div className="mt-auto">
              <h1 className="text-2xl leading-tight font-bold text-vert">
                L&apos;espace des lauréats
              </h1>
              <p className="mt-2 text-base leading-relaxed text-ardoise">
                Votre fiche, vos documents, les offres de nos partenaires et l&apos;annuaire des
                entreprises accompagnées — en un seul endroit.
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-3 border-t border-brume pt-5">
              {chiffres.map(([n, l]) => (
                <div key={l}>
                  <dt className="text-xl font-bold text-vert tabular-nums">{n}</dt>
                  <dd className="text-xs text-pierre">{l}</dd>
                </div>
              ))}
            </dl>
          </aside>

          <div className="flex flex-col justify-center gap-5 p-8 md:p-10">{children}</div>
        </div>
      </div>
    </main>
  );
}
