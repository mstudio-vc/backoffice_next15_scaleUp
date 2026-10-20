import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { candidatures } from "@/db/schema";
import { FicheLaureat } from "@/components/fiche-laureat";
import { DocumentsLaureat } from "@/components/documents-laureat";
import { DetailCandidature } from "@/components/detail-candidature";

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

      <section>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-encre">Votre candidature</h2>
          {dossier ? (
            <p className="text-sm text-pierre">
              Déposée le{" "}
              <b className="text-encre">
                {dossier.deposeeLe
                  ? dossier.deposeeLe.toLocaleDateString("fr-FR")
                  : "date non renseignée"}
              </b>{" "}
              · {reponses} réponses conservées · signée, non modifiable
            </p>
          ) : null}
        </div>

        {dossier ? (
          /* Le dossier était résumé à sa date et à son volume : « 149 réponses conservées »
             sans jamais pouvoir en relire une. Elles sont là, rangées par thème. */
          <DetailCandidature donnees={dossier.donnees as Record<string, unknown>} />
        ) : (
          <p className="rounded bg-white p-5 text-base text-pierre ring-1 ring-brume">
            Aucune candidature importée pour votre organisation.
          </p>
        )}
      </section>
    </div>
  );
}
