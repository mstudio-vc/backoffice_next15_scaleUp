import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  demandesOffres,
  documents,
  journal,
  offres,
  organisations,
  utilisateurs,
} from "@/db/schema";
import { sessionCourante } from "@/lib/auth/session";

/**
 * Exports CSV de l'administration.
 *
 * Le séparateur est le point-virgule et le fichier commence par un BOM : c'est ce qu'attend
 * Excel en locale française, faute de quoi les accents se cassent et tout atterrit dans une
 * seule colonne.
 *
 * Les candidatures ne s'exportent pas ici : elles contiennent des données personnelles de
 * dirigeants, et un bouton de téléchargement global en ferait une fuite à portée de clic.
 */
function csv(lignes: Record<string, unknown>[]): string {
  if (lignes.length === 0) return "﻿";
  const colonnes = Object.keys(lignes[0]);
  const cellule = (v: unknown) => {
    const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return (
    "﻿" +
    [colonnes.join(";"), ...lignes.map((l) => colonnes.map((c) => cellule(l[c])).join(";"))].join("\n")
  );
}

export async function GET(_requete: Request, { params }: { params: Promise<{ quoi: string }> }) {
  const session = await sessionCourante();
  if (session?.role !== "root") return new Response("Introuvable", { status: 404 });

  const { quoi } = await params;
  let lignes: Record<string, unknown>[];

  switch (quoi) {
    case "organisations":
      // L'export portait sept colonnes, dont ni le programme, ni les secteurs, ni de quoi
      // joindre quiconque. Un fichier qu'il faut recroiser à la main avec l'écran ne sert à
      // rien : on exporte pour préparer un comité, pas pour relire ce qu'on vient de voir.
      lignes = (
        await db
          .select({
            nom: organisations.denominationSociale,
            nomCommercial: organisations.nomCommercial,
            type: organisations.type,
            metierPartenaire: organisations.typePartenaire,
            statut: organisations.statut,
            formeJuridique: organisations.formeJuridique,
            rccm: organisations.rccm,
            ncc: organisations.ncc,
            secteurs: organisations.secteurs,
            localisation: organisations.localisation,
            adresse: organisations.adresseSiege,
            telephone: organisations.telephone,
            email: organisations.emailOfficiel,
            site: organisations.siteInternet,
            linkedin: organisations.linkedin,
            description: organisations.description,
            creeLe: organisations.creeLe,
          })
          .from(organisations)
          .orderBy(organisations.denominationSociale)
      ).map((o) => ({
        ...o,
        // Le programme se déduit du type : l'écrire épargne au lecteur de le savoir.
        programme: o.type === "startup" ? "Next 15" : o.type === "pme" ? "Scale Up" : "",
        secteurs: o.secteurs.join(" | "),
      }));
      break;
    case "utilisateurs":
      lignes = await db
        .select({
          email: utilisateurs.email,
          nom: utilisateurs.nom,
          role: utilisateurs.role,
          statut: utilisateurs.statut,
          organisation: organisations.denominationSociale,
          derniereConnexion: utilisateurs.derniereConnexionLe,
        })
        .from(utilisateurs)
        .leftJoin(organisations, eq(organisations.id, utilisateurs.organisationId))
        .orderBy(utilisateurs.email);
      break;
    case "offres":
      lignes = await db
        .select({
          titre: offres.titre,
          partenaire: organisations.denominationSociale,
          categorie: offres.categorie,
          cible: offres.cible,
          statut: offres.statut,
          valideJusquAu: offres.valideJusquAu,
        })
        .from(offres)
        .innerJoin(organisations, eq(organisations.id, offres.partenaireId))
        .orderBy(desc(offres.creeLe));
      break;
    case "demandes":
      lignes = await db
        .select({
          offre: offres.titre,
          demandeur: organisations.denominationSociale,
          statut: demandesOffres.statut,
          creeLe: demandesOffres.creeLe,
          traiteeLe: demandesOffres.traiteeLe,
        })
        .from(demandesOffres)
        .innerJoin(offres, eq(offres.id, demandesOffres.offreId))
        .innerJoin(organisations, eq(organisations.id, demandesOffres.organisationId))
        .orderBy(desc(demandesOffres.creeLe));
      break;
    case "documents":
      lignes = await db
        .select({
          organisation: organisations.denominationSociale,
          titre: documents.titre,
          categorie: documents.categorie,
          version: documents.version,
          visibilite: documents.visibilite,
          deposeLe: documents.deposeLe,
        })
        .from(documents)
        .innerJoin(organisations, eq(organisations.id, documents.organisationId))
        .orderBy(desc(documents.deposeLe));
      break;
    case "journal":
      lignes = await db
        .select({
          creeLe: journal.creeLe,
          auteur: utilisateurs.email,
          action: journal.action,
          cible: journal.cible,
        })
        .from(journal)
        .leftJoin(utilisateurs, eq(utilisateurs.id, journal.utilisateurId))
        .orderBy(desc(journal.creeLe));
      break;
    default:
      return new Response("Introuvable", { status: 404 });
  }

  return new Response(csv(lignes), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${quoi}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
