import { redirect } from "next/navigation";
import { sessionCourante } from "@/lib/auth/session";
import { accueilDe } from "@/lib/garde";

// La racine ne montre rien : elle oriente vers l'espace du compte connecté.
export default async function Page() {
  const s = await sessionCourante();
  redirect(s ? accueilDe(s) : "/connexion");
}
