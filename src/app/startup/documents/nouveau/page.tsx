import { DepotDocument } from "@/components/depot-document";
import { exigerProgramme } from "@/lib/garde";

export default async function Page() {
  await exigerProgramme("next15");
  return <DepotDocument base="/startup/documents" />;
}
