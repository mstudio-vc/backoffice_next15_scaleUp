import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { utilisateurs } from "@/db/schema";
import { verifierMotDePasse } from "@/lib/auth/password";
import { ouvrirSession, sessionCourante } from "@/lib/auth/session";
import { accueilDe } from "@/lib/garde";
import { Champ, BOUTON } from "@/components/champ";

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
    <>
      <div>
        <h2 className="text-2xl font-semibold text-encre">Connexion</h2>
        <p className="mt-1 text-[15px] text-ardoise">
          Votre accès vous a été transmis par l&apos;administration du programme.
        </p>
      </div>

      {erreur ? (
        <p className="rounded-xl border border-orange/30 bg-orange/10 px-3.5 py-3 text-sm text-orange-sombre">
          Identifiants incorrects, ou compte non activé.
        </p>
      ) : null}

      <form action={connecter} className="flex flex-col gap-4">
        <Champ
          label="Adresse e-mail"
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="vous@entreprise.ci"
        />
        <Champ
          label="Mot de passe"
          name="motDePasse"
          type="password"
          required
          autoComplete="current-password"
        />
        <button className={BOUTON + " mt-1"}>Se connecter</button>
      </form>

      <p className="border-t border-brume pt-4 text-[13px] text-pierre">
        Pas encore d&apos;accès ? Il n&apos;y a pas d&apos;inscription libre : chaque compte est
        ouvert par l&apos;administration, qui vous envoie un lien pour choisir votre mot de passe.
      </p>
    </>
  );
}
