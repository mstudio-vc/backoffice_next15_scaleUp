import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { utilisateurs } from "@/db/schema";
import { verifierMotDePasse } from "@/lib/auth/password";
import { ouvrirSession, sessionCourante } from "@/lib/auth/session";
import { accueilDe } from "@/lib/garde";

// La page lit `searchParams` (le message d'erreur après un échec de connexion) et consulte la
// session : rien n'est prérendrable. Avec `cacheComponents`, c'est `instant = false` qui déclare
// une route bloquante — même convention que les layouts d'espaces.
export const instant = false;

export default async function Connexion({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const deja = await sessionCourante();
  if (deja) redirect(accueilDe(deja));
  const { erreur } = await searchParams;

  async function connecter(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const motDePasse = String(formData.get("motDePasse") ?? "");

    const [u] = await db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.email, email))
      .limit(1);

    // Un seul message d'erreur pour tous les cas — compte inconnu, mot de passe faux, compte
    // suspendu ou pas encore activé. Distinguer renseignerait un attaquant sur les comptes
    // existants.
    const ok =
      u?.statut === "actif" &&
      u.motDePasseHash !== null &&
      (await verifierMotDePasse(motDePasse, u.motDePasseHash));

    if (!ok) redirect("/connexion?erreur=1");

    await db
      .update(utilisateurs)
      .set({ derniereConnexionLe: new Date() })
      .where(eq(utilisateurs.id, u.id));
    await ouvrirSession(u.id);
    redirect("/");
  }

  return (
    <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-xl font-semibold">Connexion</h1>
      <p className="mt-1 text-sm text-slate-500">
        Votre accès vous a été transmis par l&apos;administration du programme.
      </p>

      {erreur ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Identifiants incorrects, ou compte non activé.
        </p>
      ) : null}

      <form action={connecter} className="mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Adresse e-mail
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="h-11 rounded-lg border border-slate-300 px-3 font-normal outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Mot de passe
          <input
            name="motDePasse"
            type="password"
            required
            autoComplete="current-password"
            className="h-11 rounded-lg border border-slate-300 px-3 font-normal outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <button className="mt-2 h-11 rounded-lg bg-indigo-700 font-semibold text-white hover:bg-indigo-800">
          Se connecter
        </button>
      </form>
    </div>
  );
}
