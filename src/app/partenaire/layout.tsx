import { EspaceLayout } from "@/lib/espace-layout";
import { exigerPartenaire } from "@/lib/garde";

// Espace des PARTENAIRES — fonds, banques, industriels, institutions.
//
// `programme` est nul, comme pour l'administration : un partenaire ne relève d'aucun des deux
// programmes, il sert les deux. Sa teinte le distingue des trois autres espaces.
export default async function PartenaireLayout({ children }: { children: React.ReactNode }) {
  const s = await exigerPartenaire();
  return (
    <EspaceLayout
      programme={null}
      sousTitre="Espace partenaire"
      teinte="bg-vert/10 text-vert-sombre"
      identite={s.nom ?? s.email}
      role="Partenaire"
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
