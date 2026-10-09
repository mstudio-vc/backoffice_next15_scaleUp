import { Annuaire } from "@/components/annuaire";
import { exigerProgramme } from "@/lib/garde";

export default async function Page({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  await exigerProgramme("scaleup");
  const { filtre } = await searchParams;
  return <Annuaire base="/entreprise/annuaire" filtre={filtre} />;
}
