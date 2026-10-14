import { Annuaire } from "@/components/annuaire";
import { exigerRoot } from "@/lib/garde";

export default async function Page({ searchParams }: { searchParams: Promise<{ filtre?: string; q?: string; n?: string }> }) {
  await exigerRoot();
  const { filtre, q, n } = await searchParams;
  // `toutVoir` : l'administration voit aussi les fiches en attente et suspendues.
  return <Annuaire base="/admin/annuaire" filtre={filtre} q={q} n={n} toutVoir />;
}
