import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { candidatures, organisations } from "@/db/schema";

/**
 * Le tableau de bord d'un lauréat, startup ou entreprise.
 *
 * La fiche affichée vient de `organisations` — le profil VIVANT. La candidature, elle, reste
 * figée : on n'en montre ici que la date et le volume, pour que la distinction soit visible
 * dès le premier écran.
 */
export async function TableauLaureat({ organisationId }: { organisationId: string }) {
  const org = await db.query.organisations.findFirst({
    where: eq(organisations.id, organisationId),
  });
  if (!org) return <p className="text-slate-600">Organisation introuvable.</p>;

  const dossier = await db.query.candidatures.findFirst({
    where: eq(candidatures.organisationId, organisationId),
  });
  const nbChamps = dossier ? Object.keys(dossier.donnees as object).length : 0;

  const fiche: [string, string | null][] = [
    ["Dénomination sociale", org.denominationSociale],
    ["Nom commercial", org.nomCommercial],
    ["Forme juridique", org.formeJuridique],
    ["RCCM", org.rccm],
    ["Compte contribuable", org.ncc],
    ["Siège", org.adresseSiege ?? org.siegeSocial],
    ["Téléphone", org.telephone],
    ["E-mail officiel", org.emailOfficiel],
    ["Site internet", org.siteInternet],
  ];

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-xl font-semibold">{org.denominationSociale}</h1>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {org.statut === "validee" ? "validée" : org.statut === "en_attente" ? "en attente" : "suspendue"}
          </span>
        </div>
        <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {fiche.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs tracking-wide text-slate-500 uppercase">{k}</dt>
              <dd className="text-sm">{v ?? <span className="text-slate-400">non renseigné</span>}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Votre candidature</h2>
        {dossier ? (
          <p className="mt-2 text-sm text-slate-600">
            Déposée le{" "}
            {dossier.deposeeLe
              ? dossier.deposeeLe.toLocaleDateString("fr-FR")
              : "date non renseignée"}{" "}
            · {nbChamps} réponses conservées.
            <span className="mt-2 block text-slate-500">
              Elle est conservée telle que vous l&apos;avez signée et ne change plus. Les
              corrections se font sur votre fiche ci-dessus.
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Aucune candidature importée pour le moment.</p>
        )}
      </section>
    </div>
  );
}
