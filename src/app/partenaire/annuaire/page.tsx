import { Annuaire } from "@/components/annuaire";
import { exigerPartenaire } from "@/lib/garde";

export default async function PartenaireAnnuaire({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string }>;
}) {
  await exigerPartenaire();
  const { filtre } = await searchParams;
  return <Annuaire base="/partenaire/annuaire" filtre={filtre} />;
}
