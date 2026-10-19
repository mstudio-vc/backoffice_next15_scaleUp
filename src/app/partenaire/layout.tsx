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
      identite={s.nom ?? s.email}
      role="Partenaire"
      // Le même parcours que celui des lauréats, en miroir : on arrive sur un tableau de bord,
      // le profil est un onglet comme « Ma fiche ». La racine de l'espace portait le
      // formulaire, ce qui mettait le partenaire à remplir des champs avant de savoir où il en
      // est.
      nav={[
        { href: "/partenaire", label: "Tableau de bord" },
        { href: "/partenaire/profil", label: "Mon profil" },
        { href: "/partenaire/offres", label: "Mes offres" },
        { href: "/partenaire/demandes", label: "Demandes reçues" },
        { href: "/partenaire/annuaire", label: "Annuaire" },
      ]}
    >
      {children}
    </EspaceLayout>
  );
}
