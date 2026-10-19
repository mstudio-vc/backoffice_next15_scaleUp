import { EspaceLayout } from "@/lib/espace-layout";
import { exigerRoot } from "@/lib/garde";

// Espace ROOT ADMIN — l'administration du programme. Seul espace qui crée des accès.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await exigerRoot();
  return (
    <EspaceLayout
      programme={null}
      sousTitre="Administration"
      identite={s.nom ?? s.email}
      role="Administration du programme"
      nav={[
        { href: "/admin", label: "Vue d'ensemble" },
        { href: "/admin/organisations", label: "Organisations" },
        { href: "/admin/import", label: "Import" },
        { href: "/admin/offres", label: "Offres" },
        { href: "/admin/annuaire", label: "Annuaire" },
        // « Accès » et « Journal » n'en font plus qu'un : qui peut agir et ce qui a été fait
        // sont deux moitiés de la même question. La route /admin/journal y redirige.
        { href: "/admin/acces", label: "Comptes" },
      ]}
    >
      {children}
    </EspaceLayout>
  );
}
