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
        // « Documents » a disparu de la barre : la liste et le dépôt vivent désormais dans
        // « Ma fiche », avec le reste de ce qui décrit l'entreprise. La route demeure, elle
        // porte le formulaire de dépôt et les liens déjà envoyés.
        { href: "/startup/fiche", label: "Ma fiche" },
        { href: "/startup/offres", label: "Offres" },
        { href: "/startup/annuaire", label: "Annuaire" },
      ]}
    >
      {children}
    </EspaceLayout>
  );
}
