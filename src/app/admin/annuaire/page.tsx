import { Annuaire } from "@/components/annuaire";
import { exigerRoot } from "@/lib/garde";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string; famille?: string; q?: string; n?: string }>;
}) {
  await exigerRoot();
  const { filtre, famille, q, n } = await searchParams;
  // `toutVoir` : l'administration voit aussi les fiches en attente et suspendues.
  return (
    <Annuaire
      base="/admin/annuaire"
      filtre={filtre ?? "partenaires"}
      famille={famille}
      q={q}
      n={n}
      toutVoir
    />
  );
}
