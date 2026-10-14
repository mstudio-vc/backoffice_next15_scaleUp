import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { demandesOffres, journal, offres, organisations, utilisateurs } from "@/db/schema";
import { envoyer } from "@/lib/courriel/envoi";
import { reponseDemande } from "@/lib/courriel/modeles";
import { exigerRoot } from "@/lib/garde";
import { Retour, Vide } from "@/components/page-entete";
import { STATUT_DEMANDE } from "@/lib/vocabulaire";

// Répondre aux demandes est un travail distinct de la publication des offres : il a sa page.
export default async function Demandes() {
  await exigerRoot();

  const demandeur = alias(organisations, "demandeur");
  const demandes = await db
    .select({
      id: demandesOffres.id,
      statut: demandesOffres.statut,
      creeLe: demandesOffres.creeLe,
      offre: offres.titre,
      partenaire: organisations.denominationSociale,
      demandeur: demandeur.denominationSociale,
    })
    .from(demandesOffres)
    .innerJoin(offres, eq(offres.id, demandesOffres.offreId))
    .innerJoin(organisations, eq(organisations.id, offres.partenaireId))
    .innerJoin(demandeur, eq(demandeur.id, demandesOffres.organisationId))
    .orderBy(desc(demandesOffres.creeLe));

  async function traiter(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    const id = String(formData.get("demandeId"));
    const statut = formData.get("statut") === "acceptee" ? "acceptee" : "refusee";
    await db
      .update(demandesOffres)
      .set({ statut, traiteeLe: new Date() })
      .where(eq(demandesOffres.id, id));
    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      action: `demande.${statut}`,
      cible: id,
    });

    // Prévenir le lauréat : une demande traitée sans retour oblige à surveiller l'écran.
    const d = demandes.find((x) => x.id === id);
    if (d) {
      const membres = await db
        .select({ email: utilisateurs.email, nom: utilisateurs.nom })
        .from(utilisateurs)
        .innerJoin(demandesOffres, eq(demandesOffres.organisationId, utilisateurs.organisationId))
        .where(eq(demandesOffres.id, id));

      for (const m of membres) {
        // Un envoi qui échoue ne doit pas annuler une décision déjà prise ni bloquer les
        // autres destinataires : on trace et on continue.
        try {
          await envoyer(
            { email: m.email, nom: m.nom },
            reponseDemande(d.demandeur, d.offre, d.partenaire, statut === "acceptee"),
            { utilisateurId: session.utilisateurId },
          );
        } catch (e) {
          console.error("[demandes] notification impossible", e);
        }
      }
    }

    revalidatePath("/admin/offres/demandes");
  }

  const attente = demandes.filter((d) => d.statut === "envoyee");
  const traitees = demandes.filter((d) => d.statut !== "envoyee");

  return (
    <>
      <Retour href="/admin/offres" label="Offres" />
      <h1 className="mb-1 text-2xl font-semibold text-encre">Demandes des lauréats</h1>
      <p className="mb-6 max-w-2xl text-[15px] text-ardoise">
        Les partenaires n&apos;ont pas d&apos;espace à eux : l&apos;administration répond pour
        leur compte, après accord du partenaire concerné.
      </p>

      {demandes.length === 0 ? (
        <Vide texte="Aucune demande pour le moment." />
      ) : (
        <div className="flex flex-col gap-6">
          {attente.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-pierre uppercase">
                À traiter ({attente.length})
              </h2>
              {attente.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border-l-4 border-orange bg-white p-4 shadow-sm ring-1 ring-vert/10"
                >
                  <div className="min-w-0 grow">
                    <p className="font-medium text-encre">{d.demandeur}</p>
                    <p className="text-sm text-pierre">
                      {d.offre} · {d.partenaire} · {d.creeLe.toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <form action={traiter} className="flex gap-2">
                    <input type="hidden" name="demandeId" value={d.id} />
                    <button
                      name="statut"
                      value="acceptee"
                      className="rounded-lg bg-vert px-3.5 py-2 text-sm font-semibold text-white hover:bg-vert-mid"
                    >
                      Accepter
                    </button>
                    <button
                      name="statut"
                      value="refusee"
                      className="rounded-lg border border-brume px-3.5 py-2 text-sm font-medium text-graphite hover:bg-papier"
                    >
                      Refuser
                    </button>
                  </form>
                </div>
              ))}
            </section>
          ) : null}

          {traitees.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-pierre uppercase">Traitées</h2>
              {traitees.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-vert/10"
                >
                  <div className="min-w-0 grow">
                    <p className="font-medium text-encre">{d.demandeur}</p>
                    <p className="text-sm text-pierre">
                      {d.offre} · {d.partenaire}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      d.statut === "acceptee" ? "bg-feuille/15 text-vert" : "bg-papier text-pierre"
                    }`}
                  >
                    {STATUT_DEMANDE[d.statut]}
                  </span>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
