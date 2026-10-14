import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { demandesOffres, journal, offres, organisations } from "@/db/schema";
import { exigerPartenaire } from "@/lib/garde";
import { EntetePage, Vide } from "@/components/page-entete";
import { STATUT_DEMANDE, TYPE_ORGANISATION, type StatutDemande } from "@/lib/vocabulaire";

/** Les demandes des lauréats sur les offres du partenaire connecté. */
export default async function PartenaireDemandes() {
  const s = await exigerPartenaire();

  // La jointure sur `offres.partenaireId` fait le cloisonnement EN SQL : un partenaire ne peut
  // pas voir les demandes adressées à un autre, même en forgeant une requête.
  const lignes = await db
    .select({
      demande: demandesOffres,
      offreTitre: offres.titre,
      laureat: organisations.denominationSociale,
      laureatType: organisations.type,
      laureatLocalisation: organisations.localisation,
      laureatEmail: organisations.emailOfficiel,
    })
    .from(demandesOffres)
    .innerJoin(offres, eq(offres.id, demandesOffres.offreId))
    .innerJoin(organisations, eq(organisations.id, demandesOffres.organisationId))
    .where(eq(offres.partenaireId, s.organisationId!))
    .orderBy(desc(demandesOffres.creeLe));

  async function traiter(formData: FormData) {
    "use server";
    const session = await exigerPartenaire();
    const id = String(formData.get("demandeId"));
    const statut = formData.get("statut") as StatutDemande;
    if (!["acceptee", "refusee"].includes(statut)) return;

    // On revérifie que la demande porte sur une offre DE CE partenaire : l'affichage n'est
    // pas une autorisation.
    const [d] = await db
      .select({ offreId: demandesOffres.offreId })
      .from(demandesOffres)
      .innerJoin(offres, eq(offres.id, demandesOffres.offreId))
      .where(and(eq(demandesOffres.id, id), eq(offres.partenaireId, session.organisationId!)))
      .limit(1);
    if (!d) return;

    await db
      .update(demandesOffres)
      .set({ statut, traiteeLe: new Date() })
      .where(eq(demandesOffres.id, id));

    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      organisationId: session.organisationId,
      action: `demande.${statut}`,
      cible: id,
    });
    revalidatePath("/partenaire/demandes");
  }

  const enAttente = lignes.filter((l) => l.demande.statut === "envoyee");
  const traitees = lignes.filter((l) => l.demande.statut !== "envoyee");

  return (
    <>
      <EntetePage
        titre="Demandes reçues"
        description="Les lauréats qui souhaitent bénéficier de vos offres."
      />

      <div className="flex flex-col gap-3">
        {enAttente.map(({ demande, offreTitre, laureat, laureatType, laureatLocalisation, laureatEmail }) => (
          <article
            key={demande.id}
            className="flex flex-wrap items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-vert/10"
          >
            <div className="min-w-0 grow">
              <h2 className="font-semibold text-encre">{laureat}</h2>
              <p className="text-sm text-pierre">
                {TYPE_ORGANISATION[laureatType]}
                {laureatLocalisation ? ` · ${laureatLocalisation}` : ""}
                {laureatEmail ? ` · ${laureatEmail}` : ""}
              </p>
              <p className="mt-2 text-sm text-graphite">
                Demande sur <b className="text-encre">{offreTitre}</b>
                <span className="text-pierre"> · {demande.creeLe.toLocaleDateString("fr-FR")}</span>
              </p>
              {demande.message ? (
                <p className="mt-2 rounded-xl bg-papier px-4 py-3 text-sm whitespace-pre-line text-graphite">
                  {demande.message}
                </p>
              ) : null}
            </div>
            <form action={traiter} className="flex shrink-0 gap-2">
              <input type="hidden" name="demandeId" value={demande.id} />
              <button
                name="statut"
                value="acceptee"
                className="rounded-lg bg-vert px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-vert-mid"
              >
                Accepter
              </button>
              <button
                name="statut"
                value="refusee"
                className="rounded-lg border border-brume px-3.5 py-2 text-sm font-medium text-graphite transition hover:bg-papier"
              >
                Refuser
              </button>
            </form>
          </article>
        ))}

        {enAttente.length === 0 ? <Vide texte="Aucune demande en attente." /> : null}
      </div>

      {traitees.length > 0 ? (
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-vert/10">
          <h2 className="text-lg font-semibold text-encre">Demandes traitées</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-[11px] font-semibold tracking-wide text-pierre uppercase">
                <tr>
                  <th className="py-2 pr-4">Lauréat</th>
                  <th className="py-2 pr-4">Offre</th>
                  <th className="py-2 pr-4">Réponse</th>
                  <th className="py-2">Le</th>
                </tr>
              </thead>
              <tbody>
                {traitees.map(({ demande, offreTitre, laureat }) => (
                  <tr key={demande.id} className="border-t border-brume/60">
                    <td className="py-3 pr-4 font-medium text-encre">{laureat}</td>
                    <td className="py-3 pr-4 text-graphite">{offreTitre}</td>
                    <td className="py-3 pr-4 text-graphite">{STATUT_DEMANDE[demande.statut]}</td>
                    <td className="py-3 text-graphite">
                      {demande.traiteeLe ? demande.traiteeLe.toLocaleDateString("fr-FR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
