import Link from "next/link";
import { BOUTON, BOUTON_CLAIR, Champ, Libelle, Selecteur, ZoneTexte } from "@/components/champ";
import { CarteFormulaire } from "@/components/page-entete";
import { MESSAGE_REFUS_IMAGE, TAILLE_MAX_IMAGE, type CodeRefusImage } from "@/lib/images";
import { CATEGORIE_OFFRE, CIBLE_OFFRE } from "@/lib/vocabulaire";

/**
 * Le formulaire d'une offre, partagé par l'administration et l'espace partenaire.
 *
 * Il était écrit deux fois, avec deux `<select>` stylés à la main de chaque côté. Les deux
 * copies avaient déjà divergé sur l'ordre des champs, et la couverture aurait fait une
 * troisième divergence (règle 3).
 *
 * Ce qui a changé par rapport aux deux versions précédentes :
 *
 *   · DES SECTIONS. Huit champs à plat dans une grille, le bouton coincé dans une cellule :
 *     on ne savait pas ce qui allait ensemble. Trois sections nommées, et un pied de
 *     formulaire qui porte l'action (SLDS §6) ;
 *   · UN RETOUR D'ERREUR. L'action se contentait d'un `return` silencieux quand un champ
 *     manquait : on cliquait « Publier », rien ne se passait, et rien ne l'expliquait ;
 *   · LES PRIMITIVES. Les libellés suivent enfin ceux du reste de l'application.
 */

/** Les refus du formulaire lui-même, au-delà de ceux de l'hébergeur d'images. */
export const MESSAGE_REFUS_OFFRE = {
  champs: "Le titre et la description sont obligatoires.",
  partenaire: "Choisissez le partenaire qui porte l'offre.",
} as const;

export type CodeRefusOffre = keyof typeof MESSAGE_REFUS_OFFRE | CodeRefusImage;

function message(code?: string): string | null {
  if (!code) return null;
  if (code in MESSAGE_REFUS_OFFRE) {
    return MESSAGE_REFUS_OFFRE[code as keyof typeof MESSAGE_REFUS_OFFRE];
  }
  if (code in MESSAGE_REFUS_IMAGE) return MESSAGE_REFUS_IMAGE[code as CodeRefusImage];
  return "La publication a échoué.";
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-brume pt-3 first:border-0 first:pt-0">
      <legend className="sr-only">{titre}</legend>
      <p className="mb-2 text-base font-bold text-encre">{titre}</p>
      {children}
    </fieldset>
  );
}

export function FormulaireOffre({
  action,
  retour,
  partenaires,
  erreur,
  avecCouverture,
}: {
  action: (formData: FormData) => Promise<void>;
  /** Où ramène « Annuler ». */
  retour: string;
  /** Fourni côté administration seulement : un partenaire ne choisit pas pour un autre. */
  partenaires?: { id: string; nom: string }[];
  erreur?: string;
  /** Faux tant que l'hébergeur d'images n'est pas configuré : le champ n'est alors pas proposé. */
  avecCouverture: boolean;
}) {
  const refus = message(erreur);

  if (partenaires && partenaires.length === 0) {
    return (
      <CarteFormulaire>
        <p className="text-base text-graphite">
          Aucun partenaire en base. Ajoutez-en un depuis Organisations avant de publier.
        </p>
        <Link href="/admin/organisations/nouvelle" className={`${BOUTON} mt-3`}>
          Ajouter un partenaire
        </Link>
      </CarteFormulaire>
    );
  }

  return (
    <CarteFormulaire>
      {refus ? (
        <p className="mb-4 rounded border-l-4 border-orange bg-orange/5 px-3 py-2 text-base text-graphite">
          {refus}
        </p>
      ) : null}

      <form action={action} className="flex flex-col gap-4" encType="multipart/form-data">
        <Section titre="L'offre">
          <div className="grid gap-3 sm:grid-cols-2">
            {partenaires ? (
              <div className="sm:col-span-2">
                <Selecteur label="Partenaire" name="partenaireId" required>
                  {partenaires.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </Selecteur>
              </div>
            ) : null}

            <div className="sm:col-span-2">
              <Champ
                label="Titre"
                name="titre"
                required
                maxLength={160}
                placeholder="Compte professionnel sans frais la première année"
              />
            </div>

            <Selecteur label="Catégorie" name="categorie">
              {Object.entries(CATEGORIE_OFFRE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Selecteur>

            <Selecteur
              label="Public visé"
              name="cible"
              aide="Une offre réservée aux PME n'atteindra pas les startups."
            >
              {Object.entries(CIBLE_OFFRE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Selecteur>

            <Champ
              label="Valable jusqu'au"
              name="valideJusquAu"
              type="date"
              aide="Facultatif : sans date, l'offre reste publiée jusqu'à son retrait."
            />
          </div>
        </Section>

        <Section titre="Description">
          <ZoneTexte
            label="Ce que le lauréat obtient"
            name="description"
            required
            rows={5}
            placeholder="Ce qui est offert concrètement, et à quelles conditions."
            aide="C'est le texte que les lauréats liront avant de faire leur demande."
          />
        </Section>

        {avecCouverture ? (
          <Section titre="Couverture">
            <div className="flex flex-col gap-1">
              <Libelle>Image</Libelle>
              <input
                type="file"
                name="couverture"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="w-full rounded border border-brume bg-white p-1.5 text-base file:mr-3 file:rounded file:border-0 file:bg-papier file:px-3 file:py-1 file:text-base file:text-graphite"
              />
              <span className="text-sm text-pierre">
                Facultatif. JPEG, PNG, WebP ou AVIF, {TAILLE_MAX_IMAGE / 1024 / 1024} Mo au plus.
                Un format paysage s&apos;affiche mieux dans la liste.
              </span>
            </div>
          </Section>
        ) : null}

        <div className="flex items-center gap-2 border-t border-brume pt-3">
          <button className={BOUTON}>Publier l&apos;offre</button>
          <Link href={retour} className={BOUTON_CLAIR}>
            Annuler
          </Link>
        </div>
      </form>
    </CarteFormulaire>
  );
}
