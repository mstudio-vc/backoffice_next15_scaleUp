import { exigerRoot } from "@/lib/garde";
import { CarteFormulaire, Retour } from "@/components/page-entete";
import { FormulaireImport } from "./formulaire";

export default async function Import() {
  await exigerRoot();

  return (
    <>
      <Retour href="/admin/organisations" label="Organisations" />
      <h1 className="mb-1 text-2xl font-semibold text-encre">Importer des lauréats</h1>
      <p className="mb-6 max-w-2xl text-[15px] text-ardoise">
        Déposez les exports Jotform des deux programmes. Les entreprises arrivent en attente de
        validation : elles n&apos;apparaissent dans l&apos;annuaire qu&apos;une fois validées.
      </p>

      <CarteFormulaire>
        <FormulaireImport />
      </CarteFormulaire>

      <div className="mt-6 max-w-2xl rounded-xl border-l-4 border-vert/30 bg-white/60 p-4 text-sm text-graphite">
        <p className="font-semibold">Deux garanties</p>
        <p className="mt-1.5">
          <b>Rejouable.</b> Une candidature déjà en base est reconnue et ignorée. Réimporter le
          même fichier ne crée pas de doublon — vous pouvez recommencer sans crainte.
        </p>
        <p className="mt-1.5">
          <b>Le fichier n&apos;est pas conservé.</b> Il est lu en mémoire puis oublié. Un export
          de candidature porte les coordonnées et les pièces des dirigeants : il n&apos;a rien à
          faire sur le disque du serveur.
        </p>
      </div>
    </>
  );
}
