import { Pilule } from "@/components/badge";
import { CarteTable, TD, TH, TR } from "@/components/page-entete";
import { lireCandidature } from "@/lib/lecture-candidature";

/**
 * Le contenu d'une candidature, donné à lire.
 *
 * Les sections sont des <details> natifs : elles se déplient sans une ligne de JavaScript, et
 * restent ouvertes à l'impression. Repliées par défaut, car on ne descend pas cent cinquante
 * réponses pour en chercher une — sauf la première, ouverte, pour qu'on voie qu'il y a
 * quelque chose à ouvrir.
 */
export function DetailCandidature({ donnees }: { donnees: Record<string, unknown> }) {
  const { sections, pieces, renseignees } = lireCandidature(donnees);

  if (sections.length === 0 && pieces.length === 0) {
    return <p className="text-base text-pierre">Dossier sans réponse exploitable.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-pierre">
        {renseignees} réponse{renseignees > 1 ? "s" : ""} renseignée
        {renseignees > 1 ? "s" : ""}, hors informations déjà reprises ci-dessus.
      </p>

      {sections.map((s, i) => (
        <details
          key={s.titre}
          open={i === 0}
          className="rounded border border-brume bg-white [&[open]>summary]:border-b [&[open]>summary]:border-brume"
        >
          <summary className="cursor-pointer px-4 py-2.5 text-base font-bold text-encre marker:text-pierre hover:bg-papier">
            {s.titre}
            <span className="ml-2 font-normal text-pierre">
              {s.champs.length + s.grilles.length}
            </span>
          </summary>

          <div className="flex flex-col gap-4 px-4 py-4">
            {s.champs.length > 0 ? (
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {s.champs.map((c) => (
                  <div key={c.libelle} className="min-w-0">
                    <dt className="text-sm text-pierre">{c.libelle}</dt>
                    <dd className="mt-0.5 text-base text-encre">
                      {/* Plusieurs cases cochées : des étiquettes, pas un paragraphe où elles
                          se confondraient. Une réponse unique reste du texte. */}
                      {c.valeurs.length > 1 ? (
                        <ul className="flex flex-wrap gap-1.5">
                          {c.valeurs.map((v) => (
                            <li key={v}>
                              <Pilule>{v}</Pilule>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="whitespace-pre-line">{c.valeurs[0]}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {s.grilles.map((g) => (
              <section key={g.titre}>
                <h3 className="mb-1.5 text-sm font-bold text-ardoise">{g.titre}</h3>
                <CarteTable>
                  <thead>
                    <tr>
                      <th className={TH} />
                      {g.colonnes.map((c) => (
                        <th key={c} className={TH}>
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.lignes.map((l) => (
                      <tr key={l.cle} className={TR}>
                        <th className={`${TD} text-left text-sm font-bold text-ardoise`}>
                          {l.cle}
                        </th>
                        {g.colonnes.map((c) => (
                          <td key={c} className={`${TD} text-base text-encre`}>
                            {l.cellules[c] ?? <span className="text-pierre">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </CarteTable>
              </section>
            ))}
          </div>
        </details>
      ))}

      {pieces.length > 0 ? (
        <details className="rounded border border-brume bg-white [&[open]>summary]:border-b [&[open]>summary]:border-brume">
          <summary className="cursor-pointer px-4 py-2.5 text-base font-bold text-encre marker:text-pierre hover:bg-papier">
            Pièces déposées avec la candidature
            <span className="ml-2 font-normal text-pierre">{pieces.length}</span>
          </summary>
          <div className="px-4 py-4">
            {/* Ces liens pointent vers Jotform et exigent le compte qui détient le formulaire :
                un visiteur reçoit une page de connexion, pas le fichier. On le dit, plutôt que
                de proposer un téléchargement qui échouera. */}
            <p className="mb-3 border-l-4 border-orange bg-orange/5 px-3 py-2 text-sm text-graphite">
              Fichiers restés chez Jotform, reprise en cours.
            </p>
            <ul className="flex flex-col gap-2">
              {pieces.map((p) => (
                <li key={p.libelle} className="border-t border-brume/60 pt-2 first:border-0 first:pt-0">
                  <p className="text-sm text-pierre">{p.libelle}</p>
                  {p.urls.map((u) => (
                    <p key={u} className="truncate text-base text-encre" title={u}>
                      {/* Le NOM du fichier, pas l'URL : c'est ce que le lauréat reconnaît. */}
                      {decodeURIComponent(u.split("/").pop() ?? u)}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        </details>
      ) : null}
    </div>
  );
}
