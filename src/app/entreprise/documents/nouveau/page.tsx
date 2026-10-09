import { DepotDocument } from "@/components/depot-document";
import { exigerProgramme } from "@/lib/garde";

export default async function Page() {
  await exigerProgramme("scaleup");
  return <DepotDocument base="/entreprise/documents" />;
}
