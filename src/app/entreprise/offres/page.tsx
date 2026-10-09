import { OffresLaureat } from "@/components/offres-laureat";
import { exigerProgramme } from "@/lib/garde";

export default async function Page() {
  const s = await exigerProgramme("scaleup");
  return <OffresLaureat organisationId={s.organisationId!} type="pme" base="/entreprise/offres" />;
}
