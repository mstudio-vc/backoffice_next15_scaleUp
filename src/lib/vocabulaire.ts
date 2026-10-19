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

/**
 * Le statut d'un compte. « Lien envoyé, mot de passe à définir » tenait lieu de libellé : une
 * phrase dans un badge, là où un badge doit se lire d'un coup d'œil (SLDS §7.5).
 */
export const STATUT_UTILISATEUR = {
  invite: "À activer",
  actif: "Actif",
  suspendu: "Suspendu",
} as const;

export const TON_STATUT_UTILISATEUR = {
  invite: "attente",
  actif: "succes",
  suspendu: "inactif",
} as const;

/**
 * Le ton du badge de chaque statut. Il vit à côté du libellé, pas dans l'écran : un statut
 * doit se lire de la même façon partout, et renommer ou reteinter doit coûter une ligne
 * (règle 13 : un concept, un nom).
 */
export const TON_STATUT_ORGANISATION = {
  en_attente: "attente",
  validee: "succes",
  suspendue: "inactif",
} as const;

export const TON_STATUT_DEMANDE = {
  envoyee: "attente",
  acceptee: "succes",
  refusee: "erreur",
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

/**
 * Les familles de partenaires, pour l'annuaire.
 *
 * Les sept métiers sont justes mais trop fins pour parcourir une liste : on cherche « un
 * financier », pas « une banque ou un capital-risqueur ou un fonds de capital-investissement ».
 * La famille regroupe, le métier reste affiché sur la fiche.
 */
export const FAMILLE_PARTENAIRE = {
  financier: { label: "Financier", metiers: ["banque"] },
  investisseur: { label: "Investisseur", metiers: ["vc", "private_equity"] },
  corporate: { label: "Corporate", metiers: ["industrie"] },
  autres: { label: "Autres", metiers: ["institution", "conseil", "autre"] },
} as const satisfies Record<string, { label: string; metiers: readonly TypePartenaireCle[] }>;

type TypePartenaireCle = keyof typeof TYPE_PARTENAIRE;
export type FamillePartenaire = keyof typeof FAMILLE_PARTENAIRE;

/**
 * Ce que raconte une ligne de journal.
 *
 * Le journal affichait sa clé technique — « fiche.modifiee », « acces.ouvert ». Un registre
 * d'activité est fait pour être relu par quelqu'un qui cherche ce qui s'est passé, pas par
 * celui qui a écrit l'insertion. La clé reste la vérité en base ; ceci n'est que sa lecture.
 *
 * Le verbe est au passé et sans sujet : la colonne « Qui » le porte déjà.
 */
export const ACTION_JOURNAL = {
  "acces.ouvert": "Accès ouvert",
  "candidatures.importees": "Candidatures importées",
  "organisation.creee": "Organisation créée",
  "organisation.validee": "Organisation validée",
  "organisation.refusee": "Organisation refusée",
  "organisation.suspendue": "Organisation suspendue",
  "fiche.modifiee": "Fiche modifiée",
  "profil.modifie": "Profil modifié",
  "document.depose": "Document déposé",
  "offre.publiee": "Offre publiée",
  "offre.retiree": "Offre retirée",
  "offre.republiee": "Offre republiée",
  "offre.demandee": "Offre sollicitée",
  "demande.acceptee": "Demande acceptée",
  "demande.refusee": "Demande refusée",
} as const;

/** Une action inconnue se lit telle quelle plutôt que de disparaître : le registre ne ment pas. */
export function libelleAction(action: string): string {
  return (ACTION_JOURNAL as Record<string, string>)[action] ?? action;
}

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
