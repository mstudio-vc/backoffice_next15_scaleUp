import { Annuaire } from "@/components/annuaire";
import { exigerPartenaire } from "@/lib/garde";

export default async function PartenaireAnnuaire({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string; q?: string; n?: string }>;
}) {
  await exigerPartenaire();
  const { filtre, q, n } = await searchParams;
  return <Annuaire base="/partenaire/annuaire" filtre={filtre} q={q} n={n} />;
}
