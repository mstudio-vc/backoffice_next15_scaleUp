import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { transportCourriel } from "@/lib/courriel/envoi";

/**
 * Contrôle de santé du déploiement.
 *
 * Il dit ce qui MANQUE, jamais ce qui est configuré : publier les valeurs d'un serveur sur une
 * route ouverte reviendrait à les offrir. Pas d'authentification, donc rien de sensible.
 */
export async function GET() {
  const requis = ["DATABASE_URL", "APP_URL"].filter((n) => !process.env[n]?.trim());

  let base: "ok" | "injoignable" = "ok";
  try {
    await db.execute(sql`select 1`);
  } catch {
    base = "injoignable";
  }

  const courriel = transportCourriel();
  const ok = requis.length === 0 && base === "ok" && courriel !== "console";

  return Response.json(
    {
      ok,
      base,
      // « console » signifie qu'aucun courriel ne part : les liens d'accès restent dans le
      // journal du service. Acceptable en développement, jamais en production.
      courriel,
      manquant: requis,
    },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
