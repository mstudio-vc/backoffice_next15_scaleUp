import { useId } from "react";

/**
 * Les contrôles de formulaire, en un seul endroit.
 *
 * Toutes les valeurs viennent de SLDS §7.3 et §7.4 : hauteur 32 px, rayon 4 px, texte 13 px,
 * libellé 12 px au-dessus, astérisque rouge AVANT le libellé. Ce ne sont pas des préférences :
 * ce sont les mesures d'un outil où l'on travaille, par opposition à des contrôles de 44 px
 * qui conviennent à une page d'accueil et font défiler le moindre formulaire.
 *
 * Un seul endroit les décrit : sans cela les classes se recopient d'écran en écran et
 * divergent au premier oubli.
 */
export function Champ({
  label,
  aide,
  className,
  ...props
}: React.ComponentProps<"input"> & { label: string; aide?: string }) {
  const id = useId();
  const aideId = aide ? `${id}-aide` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <Libelle htmlFor={id} obligatoire={props.required}>
        {label}
      </Libelle>
      <input
        id={id}
        aria-describedby={aideId}
        className={`${SAISIE} h-8 ${className ?? ""}`}
        {...props}
      />
      {aide ? (
        <span id={aideId} className="text-sm text-pierre">
          {aide}
        </span>
      ) : null}
    </div>
  );
}

/** Le libellé d'un contrôle. L'astérisque précède le mot : on sait avant de lire (SLDS §7.4). */
export function Libelle({
  htmlFor,
  obligatoire,
  children,
}: {
  htmlFor?: string;
  obligatoire?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm text-ardoise">
      {obligatoire ? (
        <abbr title="obligatoire" className="mr-0.5 text-orange-sombre no-underline">
          *
        </abbr>
      ) : null}
      {children}
    </label>
  );
}

/**
 * L'apparence d'une zone de saisie, sans la hauteur.
 *
 * Pour les contrôles qui ne sont pas un <input> — un <textarea> n'a pas de hauteur fixe — et
 * pour les formulaires qui posent eux-mêmes leur mise en grille.
 */
export const SAISIE =
  "w-full rounded border border-brume bg-white px-3 text-base text-encre outline-none " +
  "placeholder:text-pierre focus:border-vert focus:shadow-[0_0_3px_var(--vert)]";

/** Action principale : UNE seule par zone (SLDS §7.3). Le vert du Ministère, jamais une autre. */
export const BOUTON =
  "inline-flex h-8 items-center justify-center gap-2 rounded bg-vert px-4 text-base " +
  "text-white hover:bg-vert-mid disabled:cursor-not-allowed disabled:bg-brume";

/** Action secondaire — le cas le plus fréquent : fond blanc, bordure, texte de marque. */
export const BOUTON_CLAIR =
  "inline-flex h-8 items-center justify-center gap-2 rounded border border-brume bg-white px-4 " +
  "text-base text-vert hover:bg-papier disabled:text-pierre";

/** Action destructrice : refuser, suspendre, supprimer. Toujours rouge, jamais par défaut. */
export const BOUTON_DANGER =
  "inline-flex h-8 items-center justify-center gap-2 rounded border border-orange-sombre/30 " +
  "bg-white px-4 text-base text-orange-sombre hover:bg-orange/10";
