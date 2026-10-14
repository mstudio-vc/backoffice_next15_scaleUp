/**
 * Jeu de données de développement.
 *
 *   npm run semer              # partenaires, investisseurs, offres
 *   npm run semer -- --comptes # + un accès pour un lauréat de chaque programme
 *
 * Ne sème QUE ce que l'import ne fournit pas : les lauréats viennent des exports de
 * candidature, jamais d'ici.
 *
 * Idempotent : rejouer ne duplique rien. Et refuse de tourner en production — un jeu d'essai
 * dans la base réelle serait indiscernable des vraies données.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { offres, organisations, utilisateurs } from "@/db/schema";
import { ouvrirAcces } from "@/lib/acces";
import type { TypeOrganisation, TypePartenaire } from "@/lib/vocabulaire";

if (process.env.NODE_ENV === "production") {
  console.error("Refus : ce jeu d'essai n'a rien à faire en production.");
  process.exit(1);
}

type Partie = {
  nom: string;
  type: TypeOrganisation;
  /** Le métier, pour un partenaire. Un fonds n'est plus un type à part : c'est un métier. */
  metier?: TypePartenaire;
  description: string;
  localisation: string;
  site?: string;
  secteurs: string[];
};

// Repris de la maquette V1, qui sert de référence d'écrans.
const PARTIES: Partie[] = [
  {
    nom: "Ecobank Côte d'Ivoire",
    type: "partenaire",
    metier: "banque",
    description: "Banque panafricaine. Offres bancaires dédiées aux entreprises accompagnées.",
    localisation: "Abidjan",
    site: "https://ecobank.com",
    secteurs: ["Banque", "Paiement"],
  },
  {
    nom: "Orange Digital Center",
    type: "partenaire",
    metier: "industrie",
    description: "Formation, accompagnement technique et crédits cloud pour les équipes produit.",
    localisation: "Abidjan",
    site: "https://orangedigitalcenters.com",
    secteurs: ["Formation", "Cloud"],
  },
  {
    nom: "Cabinet CERIN",
    type: "partenaire",
    metier: "conseil",
    description: "Conseil juridique et fiscal, avec une pratique OHADA.",
    localisation: "Abidjan",
    secteurs: ["Juridique", "Fiscalité"],
  },
  {
    nom: "Janngo Capital",
    type: "partenaire",
    metier: "vc",
    description: "Fonds panafricain, tickets d'amorçage et de série A.",
    localisation: "Abidjan",
    site: "https://janngo.africa",
    secteurs: ["Fintech", "Agritech", "Santé"],
  },
  {
    nom: "Partech Africa",
    type: "partenaire",
    metier: "vc",
    description: "Fonds de capital-risque, de l'amorçage à la croissance.",
    localisation: "Dakar",
    secteurs: ["Fintech", "Logistique"],
  },
  {
    nom: "Saviu Ventures",
    type: "partenaire",
    metier: "vc",
    description: "Investisseur en amorçage sur l'Afrique francophone.",
    localisation: "Abidjan",
    secteurs: ["Intelligence artificielle", "Mobilité"],
  },
];

const OFFRES = [
  {
    partenaire: "Ecobank Côte d'Ivoire",
    titre: "Compte professionnel sans frais la première année",
    categorie: "banque_paiement" as const,
    cible: "toutes" as const,
    valideJusquAu: "2027-03-31",
    description:
      "Ouverture de compte accélérée, frais de tenue offerts douze mois, et un interlocuteur dédié aux entreprises des programmes.",
  },
  {
    partenaire: "Orange Digital Center",
    titre: "Crédits cloud et accompagnement technique",
    categorie: "cloud_infrastructure" as const,
    cible: "toutes" as const,
    valideJusquAu: "2027-06-30",
    description:
      "Crédits d'hébergement sur douze mois et deux journées d'accompagnement avec un architecte.",
  },
  {
    partenaire: "Orange Digital Center",
    titre: "Atelier produit",
    categorie: "formation" as const,
    cible: "startups" as const,
    valideJusquAu: null,
    description: "Trois jours d'atelier sur le cadrage produit et la mise en marché.",
  },
  {
    partenaire: "Cabinet CERIN",
    titre: "Revue de conformité OHADA",
    categorie: "juridique" as const,
    cible: "pme" as const,
    valideJusquAu: null,
    description:
      "Revue des statuts, de la gouvernance et des obligations déclaratives, avec un rapport de recommandations.",
  },
];

let crees = 0;
for (const p of PARTIES) {
  const deja = await db.query.organisations.findFirst({
    where: and(eq(organisations.denominationSociale, p.nom), eq(organisations.type, p.type)),
  });
  if (deja) continue;
  await db.insert(organisations).values({
    type: p.type,
    typePartenaire: p.metier ?? null,
    denominationSociale: p.nom,
    description: p.description,
    localisation: p.localisation,
    siteInternet: p.site ?? null,
    secteurs: p.secteurs,
    statut: "validee",
  });
  crees += 1;
}
console.info(`Partenaires : ${crees} créés, ${PARTIES.length - crees} déjà présents.`);

let offresCreees = 0;
for (const o of OFFRES) {
  const partenaire = await db.query.organisations.findFirst({
    where: eq(organisations.denominationSociale, o.partenaire),
  });
  if (!partenaire) continue;
  const deja = await db.query.offres.findFirst({
    where: and(eq(offres.partenaireId, partenaire.id), eq(offres.titre, o.titre)),
  });
  if (deja) continue;
  await db.insert(offres).values({
    partenaireId: partenaire.id,
    titre: o.titre,
    description: o.description,
    categorie: o.categorie,
    cible: o.cible,
    valideJusquAu: o.valideJusquAu,
  });
  offresCreees += 1;
}
console.info(`Offres : ${offresCreees} créées, ${OFFRES.length - offresCreees} déjà présentes.`);

if (process.argv.includes("--comptes")) {
  // Un lauréat de chaque programme, pour pouvoir ouvrir les deux espaces. Aucun mot de passe
  // n'est posé ici : on ouvre un accès, comme pour n'importe qui, et le lien s'affiche.
  for (const type of ["startup", "pme"] as const) {
    const org = await db.query.organisations.findFirst({
      where: and(eq(organisations.type, type), eq(organisations.statut, "en_attente")),
    });
    if (!org) {
      console.warn(`Aucun lauréat ${type} : lancez d'abord l'import des candidatures.`);
      continue;
    }
    await db
      .update(organisations)
      .set({ statut: "validee" })
      .where(eq(organisations.id, org.id));

    const email = `${type}@exemple.test`;
    const deja = await db.query.utilisateurs.findFirst({ where: eq(utilisateurs.email, email) });
    const id =
      deja?.id ??
      (
        await db
          .insert(utilisateurs)
          .values({ email, nom: `Essai ${type}`, organisationId: org.id, statut: "invite" })
          .returning({ id: utilisateurs.id })
      )[0].id;
    console.info(`\n── accès d'essai ${type} → ${org.denominationSociale}`);
    await ouvrirAcces(id, null);
  }
}

process.exit(0);
