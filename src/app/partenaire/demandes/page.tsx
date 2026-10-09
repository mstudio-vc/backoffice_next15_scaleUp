import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { demandesOffres, journal, offres, organisations } from "@/db/schema";
import { exigerPartenaire } from "@/lib/garde";
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

    // On revérifie que la demande porte bien sur une offre DE CE partenaire : l'affichage
    // n'est pas une autorisation.
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
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold">
          {enAttente.length} demande{enAttente.length > 1 ? "s" : ""} à traiter
        </h1>
        <div className="mt-4 flex flex-col gap-3">
          {enAttente.map(({ demande, offreTitre, laureat, laureatType, laureatLocalisation, laureatEmail }) => (
            <article key={demande.id} className="flex flex-wrap items-start gap-4 rounded-xl p-4 ring-1 ring-slate-200">
              <div className="min-w-0 grow">
                <h2 className="font-semibold">{laureat}</h2>
                <p className="text-sm text-slate-500">
                  {TYPE_ORGANISATION[laureatType]}
                  {laureatLocalisation ? ` · ${laureatLocalisation}` : ""}
                  {laureatEmail ? ` · ${laureatEmail}` : ""}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Demande sur <span className="font-medium">{offreTitre}</span>
                  <span className="text-slate-500">
                    {" "}· {demande.creeLe.toLocaleDateString("fr-FR")}
                  </span>
                </p>
                {demande.message ? (
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-700">
                    {demande.message}
                  </p>
                ) : null}
              </div>
              <form action={traiter} className="flex gap-2">
                <input type="hidden" name="demandeId" value={demande.id} />
                <button
                  name="statut"
                  value="acceptee"
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Accepter
                </button>
                <button
                  name="statut"
                  value="refusee"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                >
                  Refuser
                </button>
              </form>
            </article>
          ))}
          {enAttente.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
              Aucune demande en attente.
            </p>
          ) : null}
        </div>
      </section>

      {traitees.length > 0 ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold">Demandes traitées</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="py-2 pr-4">Lauréat</th>
                  <th className="py-2 pr-4">Offre</th>
                  <th className="py-2 pr-4">Réponse</th>
                  <th className="py-2">Le</th>
                </tr>
              </thead>
              <tbody>
                {traitees.map(({ demande, offreTitre, laureat }) => (
                  <tr key={demande.id} className="border-t border-slate-100">
                    <td className="py-3 pr-4 font-medium">{laureat}</td>
                    <td className="py-3 pr-4 text-slate-600">{offreTitre}</td>
                    <td className="py-3 pr-4 text-slate-600">{STATUT_DEMANDE[demande.statut]}</td>
                    <td className="py-3 text-slate-600">
                      {demande.traiteeLe ? demande.traiteeLe.toLocaleDateString("fr-FR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
