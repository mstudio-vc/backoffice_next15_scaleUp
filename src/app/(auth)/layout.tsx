
// Tout cet espace dépend de la session : rien n'est prérendrable. Avec `cacheComponents`,
// c'est `instant = false` qui déclare une route bloquante, et non `dynamic`.
export const instant = false;
// Espace d'authentification : pas de navigation, rien à atteindre tant qu'on n'est pas entré.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Ivoire Tech
        </p>
        {children}
      </div>
    </main>
  );
}
