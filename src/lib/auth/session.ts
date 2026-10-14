import "server-only";
import { cookies } from "next/headers";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions, utilisateurs } from "@/db/schema";
import { programmeDe } from "@/lib/vocabulaire";
import { empreinteJeton, genererJeton } from "@/lib/auth/jeton";

const COOKIE = "n15_session";
const DUREE_JOURS = 7;

export type Session = {
  utilisateurId: string;
  email: string;
  nom: string | null;
  role: "root" | "membre";
  organisationId: string | null;
  programme: "next15" | "scaleup" | null;
  /**
   * Le type de l'organisation rattachée. Il est porté explicitement parce qu'un partenaire se
   * reconnaît à cela : déduire « partenaire » d'un `programme` nul serait une règle implicite,
   * donc une règle qu'on finit par oublier.
   */
  typeOrganisation: "startup" | "pme" | "partenaire" | null;
};

/** Ouvre une session et pose le cookie. Le jeton en clair ne quitte pas cette fonction. */
export async function ouvrirSession(utilisateurId: string): Promise<void> {
  const { jeton, empreinte } = genererJeton();
  const expireLe = new Date(Date.now() + DUREE_JOURS * 24 * 3600 * 1000);

  await db.insert(sessions).values({ utilisateurId, jetonHash: empreinte, expireLe });

  (await cookies()).set(COOKIE, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expireLe,
  });
}

/**
 * Lit la session courante, ou `null`.
 *
 * L'expiration est filtrée EN SQL (`expire_le > now()`) : une session expirée ne doit jamais
 * remonter jusqu'au code applicatif, où l'on risquerait d'oublier de la vérifier.
 *
 * L'heure vient de `now()`, pas d'un `new Date()` côté application. Deux raisons : le rendu ne
 * doit lire aucune valeur instable — `cacheComponents` le refuse — et c'est la base qui fait
 * foi sur l'heure, ce qui supprime tout décalage d'horloge entre elle et le serveur.
 */
export async function sessionCourante(): Promise<Session | null> {
  const jeton = (await cookies()).get(COOKIE)?.value;
  if (!jeton) return null;

  const [row] = await db
    .select({
      utilisateurId: utilisateurs.id,
      email: utilisateurs.email,
      nom: utilisateurs.nom,
      role: utilisateurs.role,
      organisationId: utilisateurs.organisationId,
      statut: utilisateurs.statut,
    })
    .from(sessions)
    .innerJoin(utilisateurs, eq(utilisateurs.id, sessions.utilisateurId))
    .where(and(eq(sessions.jetonHash, empreinteJeton(jeton)), gt(sessions.expireLe, sql`now()`)))
    .limit(1);

  // Un compte suspendu garde son cookie mais perd sa session : la révocation est immédiate,
  // elle n'attend pas l'expiration.
  if (!row || row.statut !== "actif") return null;

  const org = row.organisationId
    ? await db.query.organisations.findFirst({
        where: (o, { eq: e }) => e(o.id, row.organisationId!),
        columns: { type: true },
      })
    : null;
  const programme = org ? programmeDe(org.type) : null;

  return {
    utilisateurId: row.utilisateurId,
    email: row.email,
    nom: row.nom,
    role: row.role,
    organisationId: row.organisationId,
    programme,
    typeOrganisation: org?.type ?? null,
  };
}

/** Ferme la session courante, côté base ET côté navigateur. */
export async function fermerSession(): Promise<void> {
  const store = await cookies();
  const jeton = store.get(COOKIE)?.value;
  if (jeton) await db.delete(sessions).where(eq(sessions.jetonHash, empreinteJeton(jeton)));
  store.delete(COOKIE);
}
