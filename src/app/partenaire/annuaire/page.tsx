import { Annuaire } from "@/components/annuaire";
import { exigerPartenaire } from "@/lib/garde";

export default async function PartenaireAnnuaire({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string; famille?: string; q?: string; n?: string }>;
}) {
  await exigerPartenaire();
  const { filtre, famille, q, n } = await searchParams;
  // Miroir de l'espace lauréat : le partenaire vient y chercher des start-up, pas ses pairs.
  return (
    <Annuaire
      base="/partenaire/annuaire"
      filtre={filtre ?? "startups"}
      famille={famille}
      q={q}
      n={n}
    />
  );
}
