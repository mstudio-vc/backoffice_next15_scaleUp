import { TableauLaureat } from "@/lib/tableau-laureat";
import { exigerProgramme } from "@/lib/garde";

export default async function StartupAccueil() {
  const s = await exigerProgramme("next15");
  return <TableauLaureat organisationId={s.organisationId!} base="/startup" />;
}
