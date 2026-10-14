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

  experimental: {
    // L'écran d'import envoie le classeur par une action de serveur, dont le corps est
    // limité à 1 Mo par défaut. Les exports connus pèsent 180 et 340 Ko ; on laisse de la
    // marge pour une promotion plus nombreuse sans avoir à y revenir en urgence.
    serverActions: { bodySizeLimit: "12mb" },
  },

  async headers() {
    return [
      {
        // Next sert `public/` en `max-age=0` : il ne peut pas savoir si un fichier change.
        // Le verrou Next 15 pèse 128 Ko compressés et était donc retéléchargé À CHAQUE page.
        //
        // Un jour de cache ferme, une semaine de péremption tolérée. Pas `immutable` : le nom
        // du fichier ne porte pas de version, et un logo remplacé resterait figé chez les
        // visiteurs. Un jour, c'est le compromis — assez pour une session de travail, assez
        // court pour qu'un changement se propage sans intervention.
        source: "/:fichier(logo-.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
  // PAS de `cacheComponents` ici, bien que ce soit le réglage par défaut du squelette.
  //
  // Il suppose qu'une partie des pages est prérendrable. Dans ce back-office, AUCUNE ne l'est :
  // chaque route lit la session, donc des cookies et l'heure courante. Next refusait alors de
  // prérendre et renvoyait « A server error occurred » sur /admin/annuaire et /admin/journal —
  // l'erreur `new Date() while prerendering`.
  //
  // Le déclarer route par route avec `instant = false` ne suffisait pas : le réglage posé sur
  // un layout ne couvre pas les pages qu'il contient.
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
