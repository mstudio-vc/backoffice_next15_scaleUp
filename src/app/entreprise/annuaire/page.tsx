import { Annuaire } from "@/components/annuaire";
import { exigerProgramme } from "@/lib/garde";

export default async function Page({ searchParams }: { searchParams: Promise<{ filtre?: string; q?: string; n?: string }> }) {
  await exigerProgramme("scaleup");
  const { filtre, q, n } = await searchParams;
  return <Annuaire base="/entreprise/annuaire" filtre={filtre} q={q} n={n} />;
}
