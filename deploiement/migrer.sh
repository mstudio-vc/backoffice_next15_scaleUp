#!/bin/sh
# Applique les migrations SQL, dans l'ordre, une seule fois chacune.
#
# `drizzle-kit` est une dépendance de développement et n'est pas déployée : la sortie autonome
# n'embarque que ce que l'application atteint. Ce script tient donc le registre lui-même, dans
# une table dédiée. Les fichiers de `drizzle/` sont du SQL ordinaire ; les commentaires
# `--> statement-breakpoint` sont ignorés par psql.
set -eu

DOSSIER="${1:-drizzle}"
: "${DATABASE_URL:?DATABASE_URL est requise}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
  'CREATE TABLE IF NOT EXISTS __migrations (nom text PRIMARY KEY, applique_le timestamptz NOT NULL DEFAULT now())'

for f in "$DOSSIER"/*.sql; do
  [ -e "$f" ] || continue
  nom=$(basename "$f")
  deja=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM __migrations WHERE nom = '$nom'")
  if [ "$deja" = "1" ]; then
    echo "  = $nom (déjà appliquée)"
    continue
  fi
  echo "  + $nom"
  # Une migration s'applique ENTIÈREMENT ou pas du tout : sans transaction, un échec à
  # mi-parcours laisserait un schéma que personne ne saurait décrire.
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q --single-transaction -f "$f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "INSERT INTO __migrations (nom) VALUES ('$nom')"
done
echo "Migrations à jour."
