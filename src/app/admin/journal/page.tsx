import { redirect } from "next/navigation";

/**
 * Le journal a rejoint les comptes.
 *
 * La route demeure : elle est dans les favoris, dans des courriels, et un lien qui meurt coûte
 * plus cher que trois lignes de redirection.
 */
export default function Journal() {
  redirect("/admin/acces?vue=activite");
}
