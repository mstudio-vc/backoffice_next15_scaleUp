import { FicheAnnuaire } from "@/components/fiche-annuaire";
import { exigerRoot } from "@/lib/garde";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await exigerRoot();
  const { id } = await params;
  return <FicheAnnuaire id={id} base="/admin/annuaire" toutVoir />;
}
