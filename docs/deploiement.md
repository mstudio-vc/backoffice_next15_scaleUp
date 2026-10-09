# Déploiement — app.ivoire.tech

Le serveur est le VPS partagé `185.98.137.69`, Apache 2.4, décrit dans
`~/workspaces/mstudio/docs/deploiements.md`. **Toute intervention doit rester additive** : un
nouveau vhost, `apache2ctl configtest` avant tout rechargement, et `reload` plutôt que
`restart` — le serveur héberge aussi des sites appartenant à d'autres clients.

Dernière vérification du serveur : 9 octobre 2026.

---

## 1. Ce qui change par rapport aux autres sites

Tout ce qui est déjà déployé ici est **statique** : un `rsync` suffit. Cette application est un
**service Node avec une base de données**. Elle a donc besoin de trois choses de plus — un
processus qui tourne, un vhost qui lui parle, et une base.

| | |
|---|---|
| Port local | **3100** (3000 est pris par le control-plane Yelema, 4000 par LiteLLM) |
| Exécution | **systemd**, compte `deploy-app`, sans privilège |
| Base | PostgreSQL 13 déjà installé sur le serveur |
| Exposition | Apache en proxy, comme `back-office-qa.yelema.ai` |

**Pourquoi systemd et non Docker**, alors que le seul précédent Node tourne en Docker : donner
l'accès au démon Docker à un compte de déploiement revient à lui donner root. Cela contredirait
le modèle de sécurité de la maison — un compte par site, sans sudo — sur un serveur qui héberge
plusieurs clients. Le compte `deploy-app` ne reçoit qu'un droit : redémarrer *son* service.

---

## 2. Prérequis

- **Le DNS.** `app.ivoire.tech` ne résout pas encore. Créer l'enregistrement dans Cloudflare,
  proxifié, vers `185.98.137.69`.
- **Les fichiers de ce dossier** : `deploiement/app-ivoire-tech.service`,
  `deploiement/app.ivoire.tech.conf`, `deploiement/migrer.sh`.

---

## 3. Mise en place, une seule fois (root)

```bash
ssh ivoire
```

### Le compte et les dossiers

```bash
adduser --system --group --home /var/www/app.ivoire.tech --shell /bin/sh deploy-app
usermod -g www-data deploy-app
install -d -o deploy-app -g www-data -m 2755 /var/www/app.ivoire.tech/courant
install -d -o deploy-app -g www-data -m 2750 /var/www/app.ivoire.tech/stockage
install -d -o deploy-app -g deploy-app -m 700 /var/www/app.ivoire.tech/.ssh
```

Déposer la clé publique de déploiement dans
`/var/www/app.ivoire.tech/.ssh/authorized_keys` (`600`, propriétaire `deploy-app`).

### La base

```bash
su - postgres -c "createuser app_ivoire_tech --pwprompt"
su - postgres -c "createdb app_ivoire_tech --owner app_ivoire_tech"
```

### La configuration

`/etc/app-ivoire-tech.env`, en `640`, propriétaire `root`, groupe `deploy-app` — le compte de
déploiement doit la lire pour les migrations, mais personne d'autre :

```
DATABASE_URL=postgresql://app_ivoire_tech:<mot de passe>@127.0.0.1:5432/app_ivoire_tech
APP_URL=https://app.ivoire.tech
STOCKAGE_DIR=/var/www/app.ivoire.tech/stockage
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM="Ivoire Tech <no-reply@ivoire.tech>"
```

> Tant que `SMTP_HOST` est vide, **aucun courriel ne part** : les liens d'accès ne sont écrits
> que dans le journal du service. À renseigner avant d'ouvrir le premier accès à un lauréat.

### Le service

```bash
cp deploiement/app-ivoire-tech.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable app-ivoire-tech
```

Le droit de redémarrage, et lui seul :

```bash
echo 'deploy-app ALL=(root) NOPASSWD: /usr/bin/systemctl restart app-ivoire-tech' \
  > /etc/sudoers.d/deploy-app
chmod 440 /etc/sudoers.d/deploy-app
visudo -c
```

### Le vhost

```bash
cp deploiement/app.ivoire.tech.conf /etc/apache2/sites-available/
a2ensite app.ivoire.tech
apache2ctl configtest && systemctl reload apache2
certbot --apache -d app.ivoire.tech
```

`certbot` écrit le pendant en `:443` dans un fichier `-le-ssl.conf` séparé. **Ne pas y toucher
à la main.** Et ne pas ajouter de `renew_hook` par certificat : le hook global
`/etc/letsencrypt/renewal-hooks/deploy/reload-apache.sh` couvre déjà tout.

---

## 4. Les secrets GitHub

Mêmes noms que les autres dépôts de la maison (*Settings → Secrets and variables → Actions*) :

| Secret | Contenu |
|---|---|
| `VPS_HOST` | l'IP du serveur |
| `VPS_USER` | `deploy-app` |
| `VPS_PATH` | `/var/www/app.ivoire.tech/courant/` — **barre finale comprise** |
| `VPS_SSH_KEY` | la clé privée dédiée, lignes `BEGIN`/`END` et saut de ligne final inclus |
| `VPS_KNOWN_HOSTS` | l'empreinte `ssh-ed25519` du serveur |

La barre finale de `VPS_PATH` compte : `rsync` distingue `/courant` de `/courant/`.

---

## 5. Déployer

Pousser sur `production`. Le workflow construit, assemble, envoie, migre, redémarre et vérifie.

Il **refuse d'envoyer** un paquet contenant `data/` ou un `.xlsx` : ce serait les données
personnelles de 155 entreprises sur un serveur partagé.

### Amorcer le premier compte

Après le premier déploiement, il n'existe aucun compte — il n'y a pas d'inscription libre.
`creer:root` a besoin de `tsx`, qui n'est pas déployé ; on crée donc le compte à la main :

```bash
ssh ivoire
su - postgres -c "psql app_ivoire_tech -c \"
  INSERT INTO utilisateurs (email, nom, role, statut)
  VALUES ('admin@ivoire.tech', 'Administration', 'root', 'invite')\""
```

Puis ouvrir l'accès depuis le poste de développement, pointé sur la base de production par un
tunnel SSH — ou, plus simplement, renseigner `SMTP_HOST` et ouvrir l'accès depuis
`/admin/acces` une fois le premier compte actif.

> **Point ouvert à trancher** : l'amorçage mériterait une commande dédiée embarquée dans le
> paquet. En l'état, il demande un passage par psql, ce qui est acceptable une fois mais pas
> à chaque environnement.

---

## 6. Contrôles

```bash
# Le service
ssh ivoire 'systemctl status app-ivoire-tech --no-pager'
ssh ivoire 'journalctl -u app-ivoire-tech -n 50 --no-pager'

# Le service répond, sans passer par le DNS ni Cloudflare
ssh ivoire 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3100/connexion'

# Le site, sans dépendre du résolveur local
curl --resolve "app.ivoire.tech:443:185.98.137.69" https://app.ivoire.tech/

# Les migrations appliquées
ssh ivoire 'su - postgres -c "psql app_ivoire_tech -c \"SELECT * FROM __migrations\""'
```

Un domaine fraîchement créé se vérifie avec `dig @1.1.1.1`, jamais avec le résolveur système :
plusieurs diagnostics ont déjà été faussés par un cache local périmé.

---

## 7. Ce que ce déploiement ne règle pas

**Les sauvegardes.** Rien n'est prévu pour la base ni pour `stockage/`. Ce dernier contient des
pièces d'identité et des états financiers : une perte serait irréparable, et une fuite grave.

**Le stockage des documents est sur le disque local.** `src/lib/stockage.ts` est le seul module
à remplacer le jour où ce sera un stockage objet.

**Aucune journalisation applicative centralisée** : tout passe par `journalctl`.
