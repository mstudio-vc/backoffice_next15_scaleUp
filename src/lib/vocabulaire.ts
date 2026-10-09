/**
 * Les libellés affichés, en un seul endroit.
 *
 * Le code manipule des clés d'énumération ; l'écran montre du français. Les séparer évite que
 * le même statut s'écrive de trois façons selon la page.
 */
export const TYPE_ORGANISATION = {
  startup: "Startup",
  pme: "PME",
  partenaire: "Partenaire",
} as const;

/**
 * Le métier d'un partenaire — ce qu'il fait, pas où il entre. Un fonds n'est pas un rôle à
 * part : c'est un partenaire dont le métier est l'investissement.
 */
export const TYPE_PARTENAIRE = {
  vc: "Capital-risque",
  private_equity: "Capital-investissement",
  banque: "Banque",
  industrie: "Industrie",
  institution: "Institution",
  conseil: "Conseil",
  autre: "Autre",
} as const;

export const PROGRAMME = { next15: "Ivoire Tech Next 15", scaleup: "Ivoire Tech Scale Up" } as const;

export const STATUT_ORGANISATION = {
  en_attente: "En attente",
  validee: "Validée",
  suspendue: "Suspendue",
} as const;

export const CATEGORIE_OFFRE = {
  cloud_infrastructure: "Cloud et infrastructure",
  juridique: "Juridique",
  comptabilite_fiscalite: "Comptabilité et fiscalité",
  banque_paiement: "Banque et paiement",
  formation: "Formation",
  recrutement: "Recrutement",
  marketing_communication: "Marketing et communication",
  logistique: "Logistique",
  autre: "Autre",
} as const;

export const CIBLE_OFFRE = { startups: "Startups", pme: "PME", toutes: "Startups et PME" } as const;

export const CATEGORIE_DOCUMENT = {
  presentation: "Présentation",
  business_plan: "Business plan",
  etats_financiers: "États financiers",
  statuts: "Statuts et documents légaux",
  autre: "Autre",
} as const;

export const VISIBILITE_DOCUMENT = {
  organisation: "Mon organisation",
  investisseurs: "Investisseurs validés",
  partenaires: "Partenaires validés",
  tous: "Tous les membres validés",
} as const;

export const STATUT_DEMANDE = {
  envoyee: "Envoyée",
  acceptee: "Acceptée",
  refusee: "Refusée",
} as const;

export type TypeOrganisation = keyof typeof TYPE_ORGANISATION;
export type TypePartenaire = keyof typeof TYPE_PARTENAIRE;
export type Programme = keyof typeof PROGRAMME;
export type CategorieOffre = keyof typeof CATEGORIE_OFFRE;
export type CibleOffre = keyof typeof CIBLE_OFFRE;
export type StatutDemande = keyof typeof STATUT_DEMANDE;
export type CategorieDocument = keyof typeof CATEGORIE_DOCUMENT;

/** Le programme d'un lauréat se déduit de son type ; un partenaire n'en a pas. */
export function programmeDe(type: TypeOrganisation): Programme | null {
  if (type === "startup") return "next15";
  if (type === "pme") return "scaleup";
  return null;
}

/** Le type d'organisation attendu dans un espace de programme. */
export function typeDuProgramme(p: Programme): TypeOrganisation {
  return p === "next15" ? "startup" : "pme";
}

/** Une offre s'adresse-t-elle à ce type de lauréat ? */
export function offreVisiblePour(cible: keyof typeof CIBLE_OFFRE, type: TypeOrganisation): boolean {
  if (cible === "toutes") return true;
  return cible === "startups" ? type === "startup" : type === "pme";
}
