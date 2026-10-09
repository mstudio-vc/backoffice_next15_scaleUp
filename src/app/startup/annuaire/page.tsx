import { Annuaire } from "@/components/annuaire";
import { exigerProgramme } from "@/lib/garde";

export default async function Page({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  await exigerProgramme("next15");
  const { filtre } = await searchParams;
  return <Annuaire base="/startup/annuaire" filtre={filtre} />;
}
