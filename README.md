# Back-office Next 15 & Scale Up

Espace des lauréats des programmes **Ivoire Tech Next 15** et **Ivoire Tech Scale Up**.
Un seul projet Next.js, une base PostgreSQL, **trois espaces** aux layouts distincts.

| Espace | URL | Pour qui |
|---|---|---|
| Startup | `/startup` | lauréats **Next 15** |
| Entreprise | `/entreprise` | lauréats **Scale Up** (PME et ETI) |
| Administration | `/admin` | l'équipe du programme |

Chacun a son layout — bande d'en-tête, intitulés, navigation — et son garde d'accès. Un
membre n'entre que dans l'espace de **son** programme ; un compte d'administration n'entre
que dans `/admin`.

---

## Démarrer

```bash
cp .env.example .env.local        # renseigner au minimum DATABASE_URL
npm install
npm run db:migrer                 # applique drizzle/0000_socle.sql
npm run creer:root -- vous@ivoire.tech "Votre nom"
npm run dev
```

`creer:root` n'invente pas de mot de passe : il **ouvre un accès**, exactement comme pour un
lauréat. Sans `SMTP_HOST`, le courriel n'est pas envoyé — le lien s'affiche dans la console.

### Importer les lauréats

```bash
npm run importer:candidatures -- data/next15.xlsx data/scaleup.xlsx
```

Les exports Jotform ne sont **pas** versionnés (`/data/` est ignoré) : ce sont des données
personnelles. Le script est idempotent — le rejouer ne crée pas de doublon.

---

## Le verrou de dépendances se régénère sous Linux

```bash
npm run verrou      # après toute modification de package.json
```

npm construit l'arborescence pour la plateforme courante. Sur macOS il hisse `fdir` à la
racine, sur Linux il le niche sous `tinyglobby`, et les variantes wasm de Tailwind n'existent
que côté Linux. **Un verrou produit sur macOS fait échouer `npm ci` sur le coureur et sur le
serveur**, tous deux en Linux x86_64 — l'inverse n'est pas vrai, npm ignorant les paquets
optionnels hors plateforme.

Ça a coûté deux déploiements avant d'être compris. Le script passe par un conteneur ; Docker
doit tourner.

---

## Les courriels

**Un seul point d'envoi** : `src/lib/courriel/envoi.ts`. Aucun autre module n'appelle Brevo ni
nodemailer, et tous les modèles vivent dans `modeles.ts`. On y gagne la trace au journal, le
choix du transport et une mise en forme commune, décidés une fois.

Trois transports, dans cet ordre : **API Brevo** si `BREVO_API_KEY`, **relais SMTP** si
`SMTP_HOST`, **console** sinon.

L'API passe avant le SMTP à dessein : sur un VPS mutualisé, le port 587 sortant est souvent
filtré, et un envoi en HTTPS ne s'en soucie pas.

La console n'est pas un pis-aller mais le mode de développement voulu — un lien d'activation ne
doit pas partir vers une vraie adresse pendant qu'on teste. `GET /api/sante` dit quel transport
est actif, sans révéler aucune valeur.

> L'expéditeur de `MAIL_FROM` doit être **vérifié dans Brevo**, sinon l'envoi est refusé.

---

## Les décisions qui structurent le reste

**La candidature est figée, la fiche est vivante.** Deux tables distinctes. `candidatures`
garde la ligne Jotform entière, en JSON, avec ses libellés d'origine : la dernière question
des deux formulaires est une attestation signée du représentant légal, donc ce qui a été
déclaré doit rester lisible tel quel. `organisations` porte ce que le lauréat peut corriger
au fil de l'eau. Une dizaine de colonnes seulement alimentent la fiche ; les 153 et 192
autres restent consultables dans la candidature.

**Deux formulaires, pas deux variantes.** Next 15 et Scale Up n'ont que 89 champs en commun
sur 153 et 192. Le programme est une énumération portée par l'organisation, pas un drapeau.

**Personne ne choisit le mot de passe d'un autre.** Le root admin ouvre un accès ; l'invité
définit son mot de passe par un lien à usage unique, valable 48 heures. C'est la seule façon
de rendre une connexion réellement imputable.

**Les jetons ne sont jamais stockés en clair.** Invitations et sessions ne gardent qu'une
empreinte SHA-256. Une fuite de la base n'ouvre aucun accès et n'usurpe aucune session.
Les mots de passe, eux, sont en scrypt — `node:crypto`, donc aucune dépendance native.

**Les sessions vivent en base**, donc elles sont révocables : un compte suspendu perd sa
session au prochain appel, sans attendre l'expiration du cookie.

**Le SQL fait foi.** `drizzle/` est versionné et c'est lui qu'on applique en production ;
le schéma TypeScript ne sert qu'à le produire.

---

## Repères

| Chemin | Rôle |
|---|---|
| `src/db/schema.ts` | Le schéma — 7 tables |
| `drizzle/` | Les migrations SQL, versionnées |
| `src/lib/garde.ts` | **La frontière d'autorisation**, appelée par chaque layout d'espace |
| `src/lib/auth/` | Mot de passe (scrypt), jetons, sessions |
| `src/lib/acces.ts` | Ouverture d'un accès : lien à usage unique + courriel |
| `src/lib/mail.ts` | Envoi SMTP, ou console si `SMTP_HOST` est absent |
| `scripts/` | Amorçage du root, import des candidatures |

---

## Ce qui n'est pas encore là

Le socle, l'authentification, l'import, les **documents**, les **offres**, l'**annuaire**, la
**validation des comptes** et le **journal d'activité** sont en place.

Reste à construire : la **reprise des pièces jointes des candidatures**. Les exports Jotform ne
contiennent que des URL vers `jotform.com`, et ces URL exigent une authentification au compte
qui détient les formulaires — un `fetch` anonyme reçoit une page HTML, pas le fichier. Tant que
les fichiers n'ont pas été récupérés par l'API Jotform ou par un export groupé, la table
`documents` reste vide pour les lauréats importés : une quinzaine de pièces par candidature,
dont des pièces d'identité et des états financiers, à traiter comme des données sensibles.

Deux rôles de la maquette V1 — **partenaire** et **investisseur** — n'ont pas d'espace : la
demande portait sur trois. Si la mise en relation et la publication d'offres entrent dans le
périmètre, il faudra les ajouter, et le modèle de données devra s'étendre.

Le cadrage détaillé vit dans `~/myspace/Mstudio/backofficeNext15_SCALEUP`.
