import { FicheLaureat } from "@/components/fiche-laureat";
import { exigerProgramme } from "@/lib/garde";

export default async function StartupFiche() {
  const s = await exigerProgramme("next15");
  return <FicheLaureat organisationId={s.organisationId!} base="/startup/fiche" />;
}
