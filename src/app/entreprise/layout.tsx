import { EspaceLayout } from "@/lib/espace-layout";
import { exigerProgramme } from "@/lib/garde";

// Espace des ENTREPRISES — PME et ETI lauréates du programme Scale Up.
export default async function EntrepriseLayout({ children }: { children: React.ReactNode }) {
  const s = await exigerProgramme("scaleup");
  return (
    <EspaceLayout
      programme={"scaleup"}
      sousTitre={"Espace entreprise"}
      teinte={"bg-menthe/20 text-vert"}
      identite={s.nom ?? s.email}
      role="Lauréat"
      nav={[
        { href: "/entreprise", label: "Tableau de bord" },
        { href: "/entreprise/documents", label: "Documents" },
        { href: "/entreprise/offres", label: "Offres" },
        { href: "/entreprise/annuaire", label: "Annuaire" },
      ]}
    >
      {children}
    </EspaceLayout>
  );
}
