/**
 * Crée le premier compte d'administration — l'amorçage.
 *
 * Sans lui, personne ne peut entrer : il n'y a pas d'inscription libre, et seul un root peut
 * ouvrir un accès. Le script n'invente pas de mot de passe ; il ouvre un accès comme pour
 * n'importe qui, et le lien s'affiche dans la console si aucun SMTP n'est configuré.
 *
 *   npm run creer:root -- admin@ivoire.tech "Nom Prénom"
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { utilisateurs } from "@/db/schema";
import { ouvrirAcces } from "@/lib/acces";

const email = process.argv[2]?.trim().toLowerCase();
const nom = process.argv[3]?.trim() || null;

if (!email) {
  console.error('Usage : npm run creer:root -- admin@ivoire.tech "Nom Prénom"');
  process.exit(1);
}

const [existant] = await db
  .select({ id: utilisateurs.id })
  .from(utilisateurs)
  .where(eq(utilisateurs.email, email))
  .limit(1);

const id =
  existant?.id ??
  (
    await db
      .insert(utilisateurs)
      .values({ email, nom, role: "root", statut: "invite" })
      .returning({ id: utilisateurs.id })
  )[0].id;

// `creeParId` est nul : personne n'a créé ce compte, c'est l'amorçage.
await ouvrirAcces(id, null);
console.info(existant ? "Accès renvoyé à un compte root existant." : "Compte root créé.");
process.exit(0);
