import { FicheOffre } from "@/components/fiche-offre";
import { exigerProgramme } from "@/lib/garde";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigerProgramme("next15");
  const { id } = await params;
  return (
    <FicheOffre
      offreId={id}
      organisationId={s.organisationId!}
      type="startup"
      base="/startup/offres"
    />
  );
}
