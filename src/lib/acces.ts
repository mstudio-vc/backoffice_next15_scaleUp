import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { accesInvitations, journal, utilisateurs } from "@/db/schema";
import { genererJeton, VALIDITE_INVITATION_HEURES } from "@/lib/auth/jeton";
import { courrielInvitation, envoyerCourriel } from "@/lib/mail";

/**
 * Ouvre un accès : génère un lien à usage unique et l'envoie par courriel.
 *
 * Le root admin ne choisit JAMAIS le mot de passe de quelqu'un d'autre — il ouvre un accès,
 * l'invité définit son mot de passe. Personne dans l'équipe ne connaît donc le mot de passe
 * d'un lauréat, ce qui est la seule façon de rendre une connexion réellement imputable.
 *
 * Réutilisé tel quel par le renvoi de lien : une invitation renvoyée est une invitation neuve,
 * l'ancienne cesse d'être la dernière valable.
 */
export async function ouvrirAcces(utilisateurId: string, creeParId: string | null): Promise<void> {
  const [u] = await db
    .select({ email: utilisateurs.email, nom: utilisateurs.nom })
    .from(utilisateurs)
    .where(eq(utilisateurs.id, utilisateurId))
    .limit(1);
  if (!u) throw new Error("Utilisateur introuvable");

  const { jeton, empreinte } = genererJeton();
  const expireLe = new Date(Date.now() + VALIDITE_INVITATION_HEURES * 3600 * 1000);

  await db.insert(accesInvitations).values({
    utilisateurId,
    jetonHash: empreinte,
    expireLe,
    creeParId,
  });

  const base = process.env.APP_URL ?? "http://localhost:3000";
  await envoyerCourriel({
    a: u.email,
    sujet: "Votre accès à la plateforme Ivoire Tech",
    texte: courrielInvitation(
      u.nom,
      `${base}/definir-mot-de-passe/${jeton}`,
      VALIDITE_INVITATION_HEURES,
    ),
  });

  await db.insert(journal).values({
    utilisateurId: creeParId,
    action: "acces.ouvert",
    cible: u.email,
  });
}
