import { FicheLaureat } from "@/components/fiche-laureat";
import { exigerProgramme } from "@/lib/garde";

export default async function EntrepriseFiche() {
  const s = await exigerProgramme("scaleup");
  return <FicheLaureat organisationId={s.organisationId!} base="/entreprise/fiche" />;
}
