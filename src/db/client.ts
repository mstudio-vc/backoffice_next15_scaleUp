import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

type Db = ReturnType<typeof creer>;

// Une seule connexion par processus. En développement, Next recharge les modules à chaque
// édition : sans ce cache sur `globalThis`, chaque rechargement ouvrirait un nouveau pool et
// la base finirait par refuser les connexions.
const global_ = globalThis as unknown as { __db?: Db };

function creer(): ReturnType<typeof drizzle<typeof schema>> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL n'est pas définie. Voir .env.example.");
  return drizzle(postgres(url, { max: 10 }), { schema, casing: "snake_case" });
}

/**
 * Accès paresseux : la connexion ne s'ouvre qu'au PREMIER usage, jamais à l'import.
 *
 * Next évalue les modules pendant `next build`, y compris ceux des pages dynamiques. Une
 * initialisation au niveau du module ferait donc échouer la construction sur une machine sans
 * base — un serveur de build n'a pas à connaître l'URL de la production.
 */
export const db: Db = new Proxy({} as Db, {
  get(_cible, prop, recepteur) {
    global_.__db ??= creer();
    const valeur = Reflect.get(global_.__db, prop, recepteur);
    return typeof valeur === "function" ? valeur.bind(global_.__db) : valeur;
  },
});

export { schema };
