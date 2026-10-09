import { EspaceLayout } from "@/lib/espace-layout";
import { exigerRoot } from "@/lib/garde";

// Tout cet espace dépend de la session : rien n'est prérendrable. Avec `cacheComponents`,
// c'est `instant = false` qui déclare une route bloquante, et non `dynamic`.
export const instant = false;

// Espace ROOT ADMIN — l'administration du programme. Seul espace qui crée des accès.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await exigerRoot();
  return (
    <EspaceLayout
      titre="Administration"
      sousTitre="Next 15 & Scale Up"
      accent="bg-slate-900"
      identite={s.nom ?? s.email}
      nav={[
        { href: "/admin", label: "Vue d'ensemble" },
        { href: "/admin/organisations", label: "Organisations" },
        { href: "/admin/offres", label: "Offres" },
        { href: "/admin/annuaire", label: "Annuaire" },
        { href: "/admin/acces", label: "Accès" },
        { href: "/admin/journal", label: "Journal" },
      ]}
    >
      {children}
    </EspaceLayout>
  );
}
