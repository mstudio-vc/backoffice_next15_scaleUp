#!/bin/sh
# Régénère package-lock.json DANS UN CONTENEUR LINUX, jamais sur le poste.
#
# npm construit l'arborescence pour la plateforme courante : sur macOS il hisse `fdir` à la
# racine, sur Linux il le niche sous `tinyglobby`, et les variantes wasm de Tailwind n'existent
# que côté Linux. Un verrou produit sur macOS fait donc échouer `npm ci` sur le coureur et sur
# le serveur, tous deux en Linux x86_64.
#
# Un verrou produit sous Linux, lui, fonctionne des deux côtés : npm ignore simplement les
# paquets optionnels qui ne correspondent pas à la plateforme.
#
#   sh scripts/verrou.sh     après toute modification de package.json
set -eu

RACINE=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d)
cp "$RACINE/package.json" "$TMP/"

docker run --rm --platform linux/amd64 -v "$TMP":/w -w /w node:20-bookworm-slim \
  sh -c 'npm install --package-lock-only --ignore-scripts' >/dev/null

cp "$TMP/package-lock.json" "$RACINE/package-lock.json"
rm -rf "$TMP"
echo "package-lock.json régénéré sous Linux. Vérifiez avec : npm ci"
