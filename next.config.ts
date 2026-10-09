import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sortie autonome : `next build` produit un serveur qui n'embarque que les dépendances
  // réellement atteintes. On déploie quelques mégaoctets au lieu d'un `node_modules` entier,
  // et le serveur n'a aucune installation à faire.
  output: "standalone",

  // La sortie autonome recopie les fichiers du projet qu'elle croit utiles. Sans cette
  // exclusion, `data/` partirait sur le serveur — c'est-à-dire les exports de candidature,
  // avec les pièces d'identité et les états financiers de 155 entreprises.
  outputFileTracingExcludes: {
    "*": ["./data/**", "./scripts/**", "./deploiement/**", "./drizzle/meta/**"],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
