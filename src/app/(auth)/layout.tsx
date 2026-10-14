import { Logo } from "@/components/logo";

/**
 * Coquille des écrans d'accès : la marque à gauche, le formulaire à droite.
 *
 * Les deux verrous sont posés sur du crème et non sur le vert : ils sont dessinés pour fond
 * clair — sur un aplat sombre, ils disparaîtraient.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-30px_rgba(6,69,52,0.45)] ring-1 ring-vert/10">
        <div className="filet-programme h-1.5" />

        <div className="grid md:grid-cols-[1.05fr_1fr]">
          <aside className="flex flex-col gap-7 bg-creme p-8 md:p-10">
            <div className="flex flex-col gap-5">
              <Logo programme="next15" hauteur={38} priority />
              <div className="h-px bg-vert/10" />
              <Logo programme="scaleup" hauteur={30} priority />
            </div>

            <div className="mt-auto">
              <h1 className="text-[26px] leading-tight font-semibold text-vert">
                L&apos;espace des lauréats
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ardoise">
                Votre fiche, vos documents, les offres de nos partenaires et l&apos;annuaire des
                entreprises accompagnées — en un seul endroit.
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-3 border-t border-vert/10 pt-5">
              {[
                ["104", "startups"],
                ["51", "PME"],
                ["2", "programmes"],
              ].map(([n, l]) => (
                <div key={l}>
                  <dt className="text-xl font-semibold text-vert tabular-nums">{n}</dt>
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
