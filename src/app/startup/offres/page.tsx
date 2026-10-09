import { OffresLaureat } from "@/components/offres-laureat";
import { exigerProgramme } from "@/lib/garde";

export default async function Page() {
  const s = await exigerProgramme("next15");
  return <OffresLaureat organisationId={s.organisationId!} type="startup" base="/startup/offres" />;
}
