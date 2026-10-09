import { TableauLaureat } from "@/lib/tableau-laureat";
import { exigerProgramme } from "@/lib/garde";

export default async function EntrepriseAccueil() {
  const s = await exigerProgramme("scaleup");
  return <TableauLaureat organisationId={s.organisationId!} />;
}
