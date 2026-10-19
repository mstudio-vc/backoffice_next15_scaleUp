import { FicheComplete } from "@/components/fiche-complete";
import { exigerProgramme } from "@/lib/garde";

export default async function EntrepriseFiche() {
  const s = await exigerProgramme("scaleup");
  return <FicheComplete organisationId={s.organisationId!} base="/entreprise" />;
}
