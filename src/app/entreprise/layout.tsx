import { EspaceLayout } from "@/lib/espace-layout";
import { exigerProgramme } from "@/lib/garde";

// Tout cet espace dépend de la session : rien n'est prérendrable. Avec `cacheComponents`,
// c'est `instant = false` qui déclare une route bloquante, et non `dynamic`.
export const instant = false;

// Espace des ENTREPRISES — PME et ETI lauréates du programme Scale Up.
export default async function EntrepriseLayout({ children }: { children: React.ReactNode }) {
  const s = await exigerProgramme("scaleup");
  return (
    <EspaceLayout
      titre="Ivoire Tech Scale Up"
      sousTitre="Espace entreprise"
      accent="bg-teal-800"
      identite={s.nom ?? s.email}
      nav={[
        { href: "/entreprise", label: "Tableau de bord" },
        { href: "/entreprise", label: "Mon organisation" },
        { href: "/entreprise", label: "Documents" },
        { href: "/entreprise", label: "Offres" },
        { href: "/entreprise", label: "Annuaire" },
      ]}
    >
      {children}
    </EspaceLayout>
  );
}
