import { Annuaire } from "@/components/annuaire";
import { exigerProgramme } from "@/lib/garde";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string; famille?: string; q?: string; n?: string }>;
}) {
  await exigerProgramme("scaleup");
  const { filtre, famille, q, n } = await searchParams;
  // Voir l'espace startup : l'annuaire s'ouvre sur les partenaires.
  return (
    <Annuaire
      base="/entreprise/annuaire"
      filtre={filtre ?? "partenaires"}
      famille={famille}
      q={q}
      n={n}
    />
  );
}
