import { DocumentsLaureat } from "@/components/documents-laureat";
import { exigerProgramme } from "@/lib/garde";

export default async function Page() {
  const s = await exigerProgramme("next15");
  return <DocumentsLaureat organisationId={s.organisationId!} base="/startup/documents" />;
}
