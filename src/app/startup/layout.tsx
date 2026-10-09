import { EspaceLayout } from "@/lib/espace-layout";
import { exigerProgramme } from "@/lib/garde";

// Tout cet espace dépend de la session : rien n'est prérendrable. Avec `cacheComponents`,
// c'est `instant = false` qui déclare une route bloquante, et non `dynamic`.
export const instant = false;

// Espace des STARTUPS — lauréates du programme Next 15.
export default async function StartupLayout({ children }: { children: React.ReactNode }) {
  const s = await exigerProgramme("next15");
  return (
    <EspaceLayout
      titre="Ivoire Tech Next 15"
      sousTitre="Espace startup"
      accent="bg-indigo-700"
      identite={s.nom ?? s.email}
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
