/**
 * Le chemin de sortie des données.
 *
 * Les six exports existaient déjà, mais aucun écran n'y menait : il fallait connaître l'URL.
 * Une fonction qu'on ne peut pas découvrir n'existe pas pour celui qui s'en sert, et le travail
 * repart alors vers un tableur tenu à la main.
 *
 * Volontairement une ancre et non un bouton : c'est un téléchargement, pas une écriture.
 */
export function ExportCsv({ quoi, label }: { quoi: string; label?: string }) {
  return (
    <a
      href={`/admin/exports/${quoi}`}
      className="inline-flex h-8 items-center gap-1.5 rounded border border-brume bg-white px-3 text-sm text-graphite transition hover:bg-papier hover:text-vert"
    >
      <span aria-hidden>↓</span> {label ?? "Exporter en CSV"}
    </a>
  );
}
