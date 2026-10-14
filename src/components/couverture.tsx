import Image from "next/image";

/**
 * L'image de couverture d'une offre.
 *
 * Deux formes, parce que les trois cartes où une offre s'affiche n'ont pas la même mise en
 * page : une bannière pour les cartes en colonne, une vignette pour celles en ligne. Les
 * dimensions vivent ici et non dans les écrans, sinon la même image aurait trois tailles.
 *
 * `alt` est VIDE, et c'est volontaire : la couverture est décorative, le titre de l'offre est
 * juste à côté. Un lecteur d'écran qui annoncerait « couverture de Compte professionnel sans
 * frais » avant de lire « Compte professionnel sans frais » ferait répéter, pas comprendre
 * (SLDS §9).
 */
export function Couverture({ url, cadre }: { url: string | null; cadre: string }) {
  if (!url) return null;
  return (
    <div className={`relative aspect-[16/9] overflow-hidden bg-papier ${cadre}`}>
      <Image
        src={url}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 480px"
        className="object-cover"
      />
    </div>
  );
}

export function Vignette({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded bg-papier">
      <Image src={url} alt="" fill sizes="64px" className="object-cover" />
    </div>
  );
}
