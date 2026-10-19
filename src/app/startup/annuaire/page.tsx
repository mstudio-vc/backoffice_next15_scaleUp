import { Annuaire } from "@/components/annuaire";
import { exigerProgramme } from "@/lib/garde";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string; famille?: string; q?: string; n?: string }>;
}) {
  await exigerProgramme("next15");
  const { filtre, famille, q, n } = await searchParams;
  // L'annuaire s'ouvre sur les PARTENAIRES : c'est ce qu'un lauréat vient y chercher, des
  // interlocuteurs. Les autres lauréats restent accessibles par les onglets.
  return (
    <Annuaire
      base="/startup/annuaire"
      filtre={filtre ?? "partenaires"}
      famille={famille}
      q={q}
      n={n}
    />
  );
}
