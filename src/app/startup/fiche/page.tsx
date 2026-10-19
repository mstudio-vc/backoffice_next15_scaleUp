import { FicheComplete } from "@/components/fiche-complete";
import { exigerProgramme } from "@/lib/garde";

export default async function StartupFiche() {
  const s = await exigerProgramme("next15");
  return <FicheComplete organisationId={s.organisationId!} base="/startup" />;
}
