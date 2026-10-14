/**
 * Script JETABLE — prépare des comptes de démonstration pour les quatre espaces,
 * et donne de la matière au partenaire. À supprimer avant toute mise en production.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { offres, organisations, utilisateurs } from "@/db/schema";
import { hacherMotDePasse } from "@/lib/auth/password";

const MDP = "Demonstration2026";

async function compte(email: string, nom: string, organisationId: string | null, role: "root" | "membre") {
  const hash = await hacherMotDePasse(MDP);
  const [u] = await db
    .insert(utilisateurs)
    .values({ email, nom, role, organisationId, motDePasseHash: hash, statut: "actif" })
    .onConflictDoUpdate({
      target: utilisateurs.email,
      set: { organisationId, motDePasseHash: hash, statut: "actif", role },
    })
    .returning({ email: utilisateurs.email });
  return u.email;
}

// Un lauréat de chaque programme, pris parmi les candidatures importées.
const [startup] = await db
  .select({ id: organisations.id, nom: organisations.denominationSociale })
  .from(organisations)
  .where(eq(organisations.type, "startup"))
  .orderBy(organisations.denominationSociale)
  .limit(1);

const [pme] = await db
  .select({ id: organisations.id, nom: organisations.denominationSociale })
  .from(organisations)
  .where(eq(organisations.type, "pme"))
  .orderBy(organisations.denominationSociale)
  .limit(1);

const [janngo] = await db
  .select({ id: organisations.id })
  .from(organisations)
  .where(eq(organisations.denominationSociale, "Janngo Capital"))
  .limit(1);

// Ces deux lauréats doivent être validés, sinon ils n'apparaissent pas dans l'annuaire.
for (const o of [startup, pme]) {
  await db.update(organisations).set({ statut: "validee" }).where(eq(organisations.id, o.id));
}

console.info("=== COMPTES (mot de passe commun : " + MDP + ") ===\n");
console.info("Ministère    " + (await compte("eir@mstudio.vc", "Eir", null, "root")));
console.info("Startup      " + (await compte("demo-startup@ivoire.tech", "Démo Startup", startup.id, "membre")) + "   → " + startup.nom);
console.info("Entreprise   " + (await compte("demo-pme@ivoire.tech", "Démo PME", pme.id, "membre")) + "       → " + pme.nom);
console.info("Partenaire   " + (await compte("partenaire-test@janngo.africa", "Test Partenaire", janngo.id, "membre")) + " → Janngo Capital");

// Une offre de Janngo, sans quoi l'écran « Mes offres » du partenaire reste vide.
const dejaOffre = await db
  .select({ id: offres.id })
  .from(offres)
  .where(and(eq(offres.partenaireId, janngo.id), eq(offres.titre, "Rendez-vous investisseur")))
  .limit(1);

if (dejaOffre.length === 0) {
  await db.insert(offres).values({
    partenaireId: janngo.id,
    titre: "Rendez-vous investisseur",
    description:
      "Un échange d'une heure avec l'équipe d'investissement pour présenter votre société, votre traction et vos besoins de financement.",
    categorie: "autre",
    cible: "toutes",
  });
  console.info("\nOffre « Rendez-vous investisseur » créée pour Janngo Capital.");
}

process.exit(0);
