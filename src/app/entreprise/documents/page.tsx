import { DocumentsLaureat } from "@/components/documents-laureat";
import { exigerProgramme } from "@/lib/garde";

export default async function Page() {
  const s = await exigerProgramme("scaleup");
  return <DocumentsLaureat organisationId={s.organisationId!} base="/entreprise/documents" />;
}
