import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documents, organisations } from "@/db/schema";
import { sessionCourante } from "@/lib/auth/session";
import { lire } from "@/lib/stockage";

/**
 * Téléchargement d'un document.
 *
 * Les fichiers ne sont PAS servis statiquement : chaque lecture passe ici, et l'autorisation
 * est vérifiée avant que le moindre octet ne sorte. Un document inaccessible répond 404 et non
 * 403 — répondre « interdit » révélerait son existence.
 */
export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await sessionCourante();
  if (!session) return new Response("Introuvable", { status: 404 });

  const [doc] = await db
    .select({
      cleStockage: documents.cleStockage,
      nomFichier: documents.nomFichier,
      visibilite: documents.visibilite,
      organisationId: documents.organisationId,
      statutProprietaire: organisations.statut,
    })
    .from(documents)
    .innerJoin(organisations, eq(organisations.id, documents.organisationId))
    .where(eq(documents.id, id))
    .limit(1);

  if (!doc?.cleStockage) return new Response("Introuvable", { status: 404 });

  const sien = doc.organisationId === session.organisationId;
  const partage = doc.visibilite === "tous" && doc.statutProprietaire === "validee";
  // Les visibilités « investisseurs » et « partenaires » n'ouvrent encore rien : ces rôles
  // n'ont pas de compte dans cette version. Elles sont enregistrées, pas appliquées.
  if (!sien && session.role !== "root" && !partage) {
    return new Response("Introuvable", { status: 404 });
  }

  try {
    const contenu = await lire(doc.cleStockage);
    return new Response(new Uint8Array(contenu), {
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename="${doc.nomFichier ?? "document"}"`,
        // Un document sensible n'a rien à faire dans un cache partagé.
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
