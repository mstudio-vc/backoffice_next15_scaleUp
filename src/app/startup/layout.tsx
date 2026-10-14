import { EspaceLayout } from "@/lib/espace-layout";
import { exigerProgramme } from "@/lib/garde";

// Espace des STARTUPS — lauréates du programme Next 15.
export default async function StartupLayout({ children }: { children: React.ReactNode }) {
  const s = await exigerProgramme("next15");
  return (
    <EspaceLayout
      programme={"next15"}
      sousTitre={"Espace startup"}
      identite={s.nom ?? s.email}
      role="Lauréat"
      nav={[
        { href: "/startup", label: "Tableau de bord" },
        { href: "/startup/fiche", label: "Ma fiche" },
        { href: "/startup/documents", label: "Documents" },
        { href: "/startup/offres", label: "Offres" },
        { href: "/startup/annuaire", label: "Annuaire" },
      ]}
    >
      {children}
    </EspaceLayout>
  );
}
