import { EspaceLayout } from "@/lib/espace-layout";
import { exigerRoot } from "@/lib/garde";

// Espace ROOT ADMIN — l'administration du programme. Seul espace qui crée des accès.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await exigerRoot();
  return (
    <EspaceLayout
      programme={null}
      sousTitre="Administration"
      teinte="bg-orange/15 text-orange-sombre"
      identite={s.nom ?? s.email}
      role="Administration du programme"
      nav={[
        { href: "/admin", label: "Vue d'ensemble" },
        { href: "/admin/organisations", label: "Organisations" },
        { href: "/admin/import", label: "Import" },
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
