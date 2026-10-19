import { OffresLaureat } from "@/components/offres-laureat";
import { exigerProgramme } from "@/lib/garde";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>;
}) {
  const s = await exigerProgramme("scaleup");
  const { categorie } = await searchParams;
  return (
    <OffresLaureat
      organisationId={s.organisationId!}
      type="pme"
      base="/entreprise/offres"
      categorie={categorie}
    />
  );
}
