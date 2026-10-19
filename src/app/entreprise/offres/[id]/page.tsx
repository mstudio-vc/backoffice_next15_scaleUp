import { FicheOffre } from "@/components/fiche-offre";
import { exigerProgramme } from "@/lib/garde";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigerProgramme("scaleup");
  const { id } = await params;
  return (
    <FicheOffre
      offreId={id}
      organisationId={s.organisationId!}
      type="pme"
      base="/entreprise/offres"
    />
  );
}
