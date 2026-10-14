import { useId } from "react";

/**
 * Champ de formulaire, partagé par les écrans d'accès et l'administration.
 *
 * Un seul endroit décrit l'apparence d'un champ : sans cela, les classes se recopient d'écran
 * en écran et finissent par diverger.
 */
export function Champ({
  label,
  aide,
  className,
  ...props
}: React.ComponentProps<"input"> & { label: string; aide?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-graphite">{label}</span>
      <input
        id={id}
        className={
          "h-11 rounded-xl border border-brume bg-white px-3.5 text-[15px] text-encre outline-none transition " +
          "placeholder:text-pierre focus:border-vert focus:ring-4 focus:ring-vert/10 " +
          (className ?? "")
        }
        {...props}
      />
      {aide ? <span className="text-xs text-pierre">{aide}</span> : null}
    </label>
  );
}

/** Bouton principal : le vert du Ministère, jamais une autre couleur. */
export const BOUTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-vert px-5 text-[15px] font-semibold text-white transition hover:bg-vert-mid disabled:cursor-not-allowed disabled:opacity-50";

/** Bouton secondaire, sur fond clair. */
export const BOUTON_CLAIR =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brume bg-white px-5 text-[15px] font-semibold text-graphite transition hover:bg-papier";
