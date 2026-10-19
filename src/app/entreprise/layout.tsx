import { EspaceLayout } from "@/lib/espace-layout";
import { exigerProgramme } from "@/lib/garde";

// Espace des ENTREPRISES — PME et ETI lauréates du programme Scale Up.
export default async function EntrepriseLayout({ children }: { children: React.ReactNode }) {
  const s = await exigerProgramme("scaleup");
  return (
    <EspaceLayout
      programme={"scaleup"}
      sousTitre={"Espace entreprise"}
      identite={s.nom ?? s.email}
      role="Lauréat"
      nav={[
        { href: "/entreprise", label: "Tableau de bord" },
        // Voir le commentaire de l'espace startup : les documents vivent dans « Ma fiche ».
        { href: "/entreprise/fiche", label: "Ma fiche" },
        { href: "/entreprise/offres", label: "Offres" },
        { href: "/entreprise/annuaire", label: "Annuaire" },
      ]}
    >
      {children}
    </EspaceLayout>
  );
}
