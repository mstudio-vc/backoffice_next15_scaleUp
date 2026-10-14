import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accesInvitations, utilisateurs } from "@/db/schema";
import { empreinteJeton } from "@/lib/auth/jeton";
import { hacherMotDePasse, LONGUEUR_MIN, motDePasseValide } from "@/lib/auth/password";
import { ouvrirSession } from "@/lib/auth/session";

export default async function DefinirMotDePasse({
  params,
  searchParams,
}: {
  params: Promise<{ jeton: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { jeton } = await params;
  const { erreur } = await searchParams;

  // Invitation valide = jamais utilisée ET non expirée. Les deux conditions sont en SQL pour
  // qu'aucun appelant ne puisse en oublier une — `now()` plutôt qu'une heure calculée ici,
  // pour la même raison que dans la lecture de session.
  const [invitation] = await db
    .select({ id: accesInvitations.id, utilisateurId: accesInvitations.utilisateurId })
    .from(accesInvitations)
    .where(
      and(
        eq(accesInvitations.jetonHash, empreinteJeton(jeton)),
        isNull(accesInvitations.utiliseLe),
        gt(accesInvitations.expireLe, sql`now()`),
      ),
    )
    .limit(1);

  if (!invitation) {
    return (
      <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold">Ce lien n&apos;est plus valable</h1>
        <p className="mt-2 text-sm text-slate-600">
          Un lien de définition de mot de passe ne sert qu&apos;une fois et expire au bout de
          quelques heures. Demandez-en un nouveau à l&apos;administration du programme.
        </p>
      </div>
    );
  }

  async function definir(formData: FormData) {
    "use server";
    const motDePasse = String(formData.get("motDePasse") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (!motDePasseValide(motDePasse) || motDePasse !== confirmation) {
      redirect(`/definir-mot-de-passe/${jeton}?erreur=1`);
    }

    // Transaction : l'invitation est consommée dans le même mouvement que l'activation du
    // compte. Sans cela, deux ouvertures simultanées du lien activeraient deux fois.
    await db.transaction(async (tx) => {
      await tx
        .update(utilisateurs)
        .set({ motDePasseHash: await hacherMotDePasse(motDePasse), statut: "actif" })
        .where(eq(utilisateurs.id, invitation.utilisateurId));
      await tx
        .update(accesInvitations)
        .set({ utiliseLe: new Date() })
        .where(eq(accesInvitations.id, invitation.id));
    });

    await ouvrirSession(invitation.utilisateurId);
    redirect("/");
  }

  return (
    <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-xl font-semibold">Définissez votre mot de passe</h1>
      <p className="mt-1 text-sm text-slate-500">
        {LONGUEUR_MIN} caractères au moins, dont une majuscule, une minuscule et un chiffre.
      </p>

      {erreur ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Mot de passe trop faible, ou confirmation différente.
        </p>
      ) : null}

      <form action={definir} className="mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Mot de passe
          <input
            name="motDePasse"
            type="password"
            required
            minLength={LONGUEUR_MIN}
            autoComplete="new-password"
            className="h-11 rounded-lg border border-slate-300 px-3 font-normal outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Confirmation
          <input
            name="confirmation"
            type="password"
            required
            autoComplete="new-password"
            className="h-11 rounded-lg border border-slate-300 px-3 font-normal outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <button className="mt-2 h-11 rounded-lg bg-indigo-700 font-semibold text-white hover:bg-indigo-800">
          Activer mon compte
        </button>
      </form>
    </div>
  );
}
