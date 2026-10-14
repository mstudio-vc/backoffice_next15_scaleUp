import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accesInvitations, utilisateurs } from "@/db/schema";
import { empreinteJeton } from "@/lib/auth/jeton";
import { hacherMotDePasse, LONGUEUR_MIN, motDePasseValide } from "@/lib/auth/password";
import { ouvrirSession } from "@/lib/auth/session";
import { Champ, BOUTON } from "@/components/champ";

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
      <>
        <span className="grid size-11 place-items-center rounded-xl bg-orange/10 text-xl text-orange-sombre">!</span>
        <div>
          <h2 className="text-2xl font-semibold text-encre">Ce lien n&apos;est plus valable</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-ardoise">
            Un lien de définition de mot de passe ne sert qu&apos;une fois et expire au bout de
            quelques heures. Demandez-en un nouveau à l&apos;administration du programme.
          </p>
        </div>
      </>
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
    <>
      <div>
        <h2 className="text-2xl font-semibold text-encre">Choisissez votre mot de passe</h2>
        <p className="mt-1 text-[15px] text-ardoise">
          {LONGUEUR_MIN} caractères au moins, dont une majuscule, une minuscule et un chiffre.
        </p>
      </div>

      {erreur ? (
        <p className="rounded-xl border border-orange/30 bg-orange/10 px-3.5 py-3 text-sm text-orange-sombre">
          Mot de passe trop faible, ou confirmation différente.
        </p>
      ) : null}

      <form action={definir} className="flex flex-col gap-4">
        <Champ
          label="Mot de passe"
          name="motDePasse"
          type="password"
          required
          minLength={LONGUEUR_MIN}
          autoComplete="new-password"
        />
        <Champ
          label="Confirmation"
          name="confirmation"
          type="password"
          required
          autoComplete="new-password"
        />
        <button className={BOUTON + " mt-1"}>Activer mon compte</button>
      </form>
    </>
  );
}
