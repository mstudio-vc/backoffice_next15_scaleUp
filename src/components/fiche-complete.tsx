import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { candidatures } from "@/db/schema";
import { FicheLaureat } from "@/components/fiche-laureat";
import { DocumentsLaureat } from "@/components/documents-laureat";

/**
 * Tout ce qui décrit une entreprise, sur un seul écran.
 *
 * La fiche, les documents et la candidature importée vivaient sur trois onglets. Or ce sont
 * trois vues de la MÊME chose : qui est cette entreprise, et sur quelles pièces. Les séparer
 * obligeait à naviguer pour répondre à une question unique — « mon dossier est-il complet ? » —
 * et la réponse n'était jamais visible d'un seul endroit.
 *
 * L'ordre suit l'autorité de la source : ce qui est signé d'abord, ce qui se corrige ensuite,
 * ce qu'on ajoute enfin.
 */
export async function FicheComplete({
  organisationId,
  base,
}: {
  organisationId: string;
  /** Racine de l'espace — « /startup » ou « /entreprise ». */
  base: string;
}) {
  const dossier = await db.query.candidatures.findFirst({
    where: eq(candidatures.organisationId, organisationId),
  });
  const reponses = dossier ? Object.keys(dossier.donnees as object).length : 0;

  return (
    <div className="flex flex-col gap-10">
      <FicheLaureat organisationId={organisationId} base={`${base}/fiche`} />

      <section>
        <DocumentsLaureat organisationId={organisationId} base={`${base}/documents`} />
      </section>

      <section className="rounded bg-white p-5 ring-1 ring-brume">
        <h2 className="text-lg font-bold text-encre">Votre candidature</h2>
        {dossier ? (
          <>
            <p className="mt-1 text-base text-ardoise">
              Déposée le{" "}
              <b className="text-encre">
                {dossier.deposeeLe
                  ? dossier.deposeeLe.toLocaleDateString("fr-FR")
                  : "date non renseignée"}
              </b>{" "}
              · <b className="text-encre">{reponses}</b> réponses conservées.
            </p>
            <p className="mt-3 border-l-4 border-orange bg-orange/5 px-4 py-3 text-sm text-graphite">
              Elle est conservée telle que vous l&apos;avez signée et ne change plus. Les
              informations ci-dessus en sont issues : corrigez-les ici, la candidature reste
              intacte.
            </p>
          </>
        ) : (
          <p className="mt-1 text-base text-pierre">Aucune candidature importée.</p>
        )}
      </section>
    </div>
  );
}
