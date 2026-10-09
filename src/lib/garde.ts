import "server-only";
import { redirect } from "next/navigation";
import { sessionCourante, type Session } from "@/lib/auth/session";

/**
 * Gardes d'accès des trois espaces.
 *
 * C'est ICI qu'est la frontière d'autorisation, et nulle part ailleurs : chaque layout d'espace
 * en appelle une en préambule. Un espace qui oublierait de le faire s'ouvrirait à tout le monde,
 * d'où l'absence de tout autre chemin vers les données.
 */
export async function exigerSession(): Promise<Session> {
  const s = await sessionCourante();
  if (!s) redirect("/connexion");
  return s;
}

export async function exigerRoot(): Promise<Session> {
  const s = await exigerSession();
  if (s.role !== "root") redirect("/");
  return s;
}

/** Un membre n'entre que dans l'espace de SON programme. */
export async function exigerProgramme(programme: "next15" | "scaleup"): Promise<Session> {
  const s = await exigerSession();
  if (s.role === "root") redirect("/admin");
  if (s.programme !== programme) redirect("/");
  return s;
}

/** Où atterrit un compte donné. Une seule définition, pour que les redirections concordent. */
export function accueilDe(s: Session): string {
  if (s.role === "root") return "/admin";
  if (s.programme === "next15") return "/startup";
  if (s.programme === "scaleup") return "/entreprise";
  return "/connexion";
}
