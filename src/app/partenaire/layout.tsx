import { EspaceLayout } from "@/lib/espace-layout";
import { exigerPartenaire } from "@/lib/garde";

// Tout cet espace dépend de la session : rien n'est prérendrable. Avec `cacheComponents`,
// c'est `instant = false` qui déclare une route bloquante, et non `dynamic`.
export const instant = false;

// Espace des PARTENAIRES — fonds, banques, industriels, institutions.
export default async function PartenaireLayout({ children }: { children: React.ReactNode }) {
  const s = await exigerPartenaire();
  return (
    <EspaceLayout
      titre="Ivoire Tech"
      sousTitre="Espace partenaire"
      accent="bg-slate-800"
      identite={s.nom ?? s.email}
      nav={[
        { href: "/partenaire", label: "Mon profil" },
        { href: "/partenaire/offres", label: "Mes offres" },
        { href: "/partenaire/demandes", label: "Demandes reçues" },
        { href: "/partenaire/annuaire", label: "Annuaire" },
      ]}
    >
      {children}
    </EspaceLayout>
  );
}
