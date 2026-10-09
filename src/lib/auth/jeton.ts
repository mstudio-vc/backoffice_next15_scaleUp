import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * Jetons d'invitation.
 *
 * Le jeton en clair n'existe QUE le temps de l'envoi du courriel : la base n'en garde que
 * l'empreinte SHA-256. Une fuite de la base ne permet donc d'ouvrir aucun accès.
 *
 * SHA-256 nu suffit ici, contrairement aux mots de passe : un jeton de 32 octets aléatoires
 * n'est pas devinable, il n'y a rien à ralentir.
 */
export function genererJeton(): { jeton: string; empreinte: string } {
  const jeton = randomBytes(32).toString("base64url");
  return { jeton, empreinte: empreinteJeton(jeton) };
}

export function empreinteJeton(jeton: string): string {
  return createHash("sha256").update(jeton).digest("base64url");
}

/** Durée de validité d'un lien de définition de mot de passe. */
export const VALIDITE_INVITATION_HEURES = 48;
