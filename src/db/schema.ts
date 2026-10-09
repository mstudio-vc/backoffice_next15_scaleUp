import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Les deux programmes. Un lauréat appartient à l'un ou à l'autre, jamais aux deux, et les
 * deux formulaires de candidature n'ont que 89 champs en commun sur 153 et 192 — c'est un
 * vrai clivage, pas une variante.
 *
 * `next15` = les startups · `scaleup` = les PME et ETI.
 */
export const programme = pgEnum("programme", ["next15", "scaleup"]);

/**
 * Ce qu'est une organisation dans l'annuaire. `startup` et `pme` sont les lauréats — des deux
 * programmes respectivement ; `partenaire` publie des offres, `investisseur` reçoit des mises
 * en relation.
 *
 * Le programme ne vit plus ici : il se déduit du type (voir `programmeDe`). Le garder en
 * double inviterait la dérive.
 */
export const typeOrganisation = pgEnum("type_organisation", [
  "startup",
  "pme",
  "partenaire",
  "investisseur",
]);

export const statutOrganisation = pgEnum("statut_organisation", [
  "en_attente",
  "validee",
  "suspendue",
]);

/** `root` = l'administration du programme ; `membre` = un compte rattaché à une organisation. */
export const roleUtilisateur = pgEnum("role_utilisateur", ["root", "membre"]);

export const statutUtilisateur = pgEnum("statut_utilisateur", [
  "invite", // identifiants générés, mot de passe pas encore défini
  "actif",
  "suspendu",
]);

export const categorieDocument = pgEnum("categorie_document", [
  "presentation",
  "business_plan",
  "etats_financiers",
  "statuts",
  "autre",
]);

/**
 * Qui voit un document. Par défaut, personne hors de l'organisation : les candidatures portent
 * pièces d'identité et états financiers, le défaut doit être le plus fermé.
 */
export const visibiliteDocument = pgEnum("visibilite_document", [
  "organisation",
  "investisseurs",
  "partenaires",
  "tous",
]);

export const categorieOffre = pgEnum("categorie_offre", [
  "cloud_infrastructure",
  "juridique",
  "comptabilite_fiscalite",
  "banque_paiement",
  "formation",
  "recrutement",
  "marketing_communication",
  "logistique",
  "autre",
]);

/** À qui s'adresse une offre. */
export const cibleOffre = pgEnum("cible_offre", ["startups", "pme", "toutes"]);

export const statutOffre = pgEnum("statut_offre", ["publiee", "retiree"]);

export const statutDemande = pgEnum("statut_demande", ["envoyee", "acceptee", "refusee"]);

/** Qui a pris l'initiative d'une mise en relation. */
export const initiateurRelation = pgEnum("initiateur_relation", ["laureat", "investisseur"]);

/**
 * L'organisation lauréate : le profil VIVANT.
 *
 * Ce que l'entreprise peut corriger au fil de l'eau — contacts, site, effectif. Distinct de
 * la candidature, qui est une déclaration signée et ne bouge plus (voir `candidatures`).
 */
export const organisations = pgTable(
  "organisations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: typeOrganisation("type").notNull(),
    denominationSociale: text("denomination_sociale").notNull(),
    nomCommercial: text("nom_commercial"),
    formeJuridique: text("forme_juridique"),
    rccm: text("rccm"),
    ncc: text("ncc"),
    siegeSocial: text("siege_social"),
    adresseSiege: text("adresse_siege"),
    telephone: text("telephone"),
    emailOfficiel: text("email_officiel"),
    siteInternet: text("site_internet"),
    linkedin: text("linkedin"),
    /** Présentation courte, affichée dans l'annuaire. */
    description: text("description"),
    localisation: text("localisation"),
    /** Secteurs d'activité, affichés en étiquettes dans l'annuaire. */
    secteurs: jsonb("secteurs").$type<string[]>().notNull().default([]),
    logoUrl: text("logo_url"),
    statut: statutOrganisation("statut").notNull().default("en_attente"),
    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
    misAJourLe: timestamp("mis_a_jour_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("organisations_type_idx").on(t.type),
    index("organisations_statut_idx").on(t.statut),
  ],
);

/**
 * La candidature telle qu'elle a été déposée : la déclaration FIGÉE.
 *
 * `donnees` garde la ligne Jotform entière, en JSON, avec ses libellés d'origine. Deux raisons :
 *   · la dernière question des deux formulaires est une attestation signée du représentant
 *     légal — ce qui a été déclaré doit rester lisible tel quel, même si le profil évolue ;
 *   · 153 et 192 champs, dont beaucoup ne seront jamais affichés : les modéliser un par un
 *     coûterait cher et ferait perdre ceux qu'on n'aurait pas prévus.
 *
 * Aucune mise à jour n'est prévue sur cette table. Une nouvelle soumission = une nouvelle ligne.
 */
export const candidatures = pgTable(
  "candidatures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    programme: programme("programme").notNull(),
    /** `Submission ID` de Jotform — garde l'import idempotent. */
    submissionId: text("submission_id"),
    deposeeLe: timestamp("deposee_le", { withTimezone: true }),
    donnees: jsonb("donnees").notNull(),
    importeeLe: timestamp("importee_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("candidatures_organisation_idx").on(t.organisationId),
    uniqueIndex("candidatures_submission_idx").on(t.programme, t.submissionId),
  ],
);

/**
 * Les comptes. Il n'y a PAS d'inscription libre : c'est le root admin qui crée un compte et
 * génère un accès (voir `acces_invitations`). Le mot de passe reste nul tant que l'invité ne
 * l'a pas défini lui-même — personne, pas même le root, ne connaît le mot de passe d'un autre.
 */
export const utilisateurs = pgTable(
  "utilisateurs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    nom: text("nom"),
    role: roleUtilisateur("role").notNull().default("membre"),
    /** Nul pour un root : il n'appartient à aucune organisation. */
    organisationId: uuid("organisation_id").references(() => organisations.id, {
      onDelete: "cascade",
    }),
    /** scrypt, au format `scrypt$N$r$p$sel$empreinte`. Nul tant que le compte est `invite`. */
    motDePasseHash: text("mot_de_passe_hash"),
    statut: statutUtilisateur("statut").notNull().default("invite"),
    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
    derniereConnexionLe: timestamp("derniere_connexion_le", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("utilisateurs_email_idx").on(t.email),
    index("utilisateurs_organisation_idx").on(t.organisationId),
  ],
);

/**
 * L'accès généré par le root admin : un lien à usage unique, envoyé par courriel, qui permet
 * à l'invité de DÉFINIR son mot de passe.
 *
 * Seule l'empreinte du jeton est stockée. Une fuite de la base ne donne donc aucun accès, et
 * le jeton en clair n'existe que le temps de l'envoi.
 */
export const accesInvitations = pgTable(
  "acces_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    jetonHash: text("jeton_hash").notNull(),
    expireLe: timestamp("expire_le", { withTimezone: true }).notNull(),
    utiliseLe: timestamp("utilise_le", { withTimezone: true }),
    creeParId: uuid("cree_par_id").references(() => utilisateurs.id, { onDelete: "set null" }),
    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("acces_invitations_jeton_idx").on(t.jetonHash),
    index("acces_invitations_utilisateur_idx").on(t.utilisateurId),
  ],
);

/**
 * Sessions côté serveur : révocables, contrairement à un jeton signé qu'on ne peut qu'attendre
 * expirer.
 *
 * Comme pour les invitations, seule l'EMPREINTE du jeton est stockée : le cookie porte le jeton
 * en clair, la base n'en garde qu'un condensé. Une fuite de la base ne permet donc d'usurper
 * aucune session.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    utilisateurId: uuid("utilisateur_id")
      .notNull()
      .references(() => utilisateurs.id, { onDelete: "cascade" }),
    jetonHash: text("jeton_hash").notNull(),
    expireLe: timestamp("expire_le", { withTimezone: true }).notNull(),
    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_jeton_idx").on(t.jetonHash),
    index("sessions_utilisateur_idx").on(t.utilisateurId),
  ],
);

/**
 * Les pièces jointes. Le fichier lui-même vit hors base (`cle_stockage`) : les candidatures
 * portent une quinzaine de documents chacune, dont des pièces d'identité et des états
 * financiers — à traiter comme des données sensibles, pas comme du contenu de page.
 */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    titre: text("titre").notNull(),
    categorie: categorieDocument("categorie").notNull().default("autre"),
    visibilite: visibiliteDocument("visibilite").notNull().default("organisation"),
    /** Redéposer sous le même titre incrémente la version ; rien n'est écrasé. */
    version: integer("version").notNull().default(1),
    /** Le libellé du champ de candidature dont il provient, quand il en vient. */
    libelleSource: text("libelle_source"),
    /** Un document est SOIT un fichier déposé, SOIT un lien externe. */
    nomFichier: text("nom_fichier"),
    cleStockage: text("cle_stockage"),
    tailleOctets: integer("taille_octets"),
    lien: text("lien"),
    deposeParId: uuid("depose_par_id").references(() => utilisateurs.id, { onDelete: "set null" }),
    deposeLe: timestamp("depose_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documents_organisation_idx").on(t.organisationId)],
);

/** Journal d'activité — la maquette du Ministère en montre un. En ajout seul. */
export const journal = pgTable(
  "journal",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    utilisateurId: uuid("utilisateur_id").references(() => utilisateurs.id, {
      onDelete: "set null",
    }),
    organisationId: uuid("organisation_id").references(() => organisations.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    cible: text("cible"),
    details: jsonb("details"),
    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("journal_cree_le_idx").on(t.creeLe)],
);

/**
 * Les offres publiées par les partenaires.
 *
 * Elles sont rattachées à l'organisation partenaire, pas à un compte : dans la version à trois
 * espaces, les partenaires n'ont pas d'accès et c'est l'administration qui publie pour eux.
 * Le jour où un espace partenaire existera, rien ne change ici.
 */
export const offres = pgTable(
  "offres",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    partenaireId: uuid("partenaire_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    titre: text("titre").notNull(),
    description: text("description").notNull(),
    categorie: categorieOffre("categorie").notNull().default("autre"),
    cible: cibleOffre("cible").notNull().default("toutes"),
    valideJusquAu: date("valide_jusqu_au"),
    statut: statutOffre("statut").notNull().default("publiee"),
    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
    misAJourLe: timestamp("mis_a_jour_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("offres_partenaire_idx").on(t.partenaireId), index("offres_statut_idx").on(t.statut)],
);

/** Une demande d'un lauréat pour bénéficier d'une offre. Une seule par couple offre/lauréat. */
export const demandesOffres = pgTable(
  "demandes_offres",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    offreId: uuid("offre_id")
      .notNull()
      .references(() => offres.id, { onDelete: "cascade" }),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    message: text("message"),
    statut: statutDemande("statut").notNull().default("envoyee"),
    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
    traiteeLe: timestamp("traitee_le", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("demandes_offres_unicite_idx").on(t.offreId, t.organisationId),
    index("demandes_offres_organisation_idx").on(t.organisationId),
  ],
);

/** Mise en relation entre un lauréat et un investisseur. Une seule par couple. */
export const misesEnRelation = pgTable(
  "mises_en_relation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    laureatId: uuid("laureat_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    investisseurId: uuid("investisseur_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    initiateur: initiateurRelation("initiateur").notNull(),
    message: text("message"),
    statut: statutDemande("statut").notNull().default("envoyee"),
    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
    traiteeLe: timestamp("traitee_le", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("mises_en_relation_unicite_idx").on(t.laureatId, t.investisseurId),
    index("mises_en_relation_investisseur_idx").on(t.investisseurId),
  ],
);
