import { Annuaire } from "@/components/annuaire";
import { exigerProgramme } from "@/lib/garde";

export default async function Page({ searchParams }: { searchParams: Promise<{ filtre?: string; q?: string; n?: string }> }) {
  await exigerProgramme("next15");
  const { filtre, q, n } = await searchParams;
  return <Annuaire base="/startup/annuaire" filtre={filtre} q={q} n={n} />;
}
