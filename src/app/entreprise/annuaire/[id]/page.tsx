import { FicheAnnuaire } from "@/components/fiche-annuaire";
import { exigerProgramme } from "@/lib/garde";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await exigerProgramme("scaleup");
  const { id } = await params;
  return <FicheAnnuaire id={id} base="/entreprise/annuaire" />;
}
