import { FicheAnnuaire } from "@/components/fiche-annuaire";
import { exigerPartenaire } from "@/lib/garde";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await exigerPartenaire();
  const { id } = await params;
  return <FicheAnnuaire id={id} base="/partenaire/annuaire" />;
}
