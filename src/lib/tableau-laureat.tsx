import Link from "next/link";
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
export async function TableauLaureat({
  organisationId,
  base,
}: {
  organisationId: string;
  /** Préfixe de l'espace, pour renvoyer vers SA fiche et non celle de l'autre espace. */
  base: string;
}) {
  const org = await db.query.organisations.findFirst({
    where: eq(organisations.id, organisationId),
  });
  if (!org) return <p className="text-ardoise">Organisation introuvable.</p>;

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

  const renseignes = fiche.filter(([, v]) => v).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Bandeau d'identité : le nom, l'état, et ce qu'il reste à compléter. Les candidatures
          sont très lacunaires — autant le dire dès le premier écran plutôt que de laisser
          découvrir des champs vides un par un. */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-vert/10">
        <div className="bg-vert px-6 py-5 text-white">
          <h1 className="text-2xl font-semibold">{org.denominationSociale}</h1>
          <p className="mt-1 text-sm text-white/75">
            {org.nomCommercial ? `${org.nomCommercial} · ` : ""}
            {org.type === "startup" ? "Ivoire Tech Next 15" : "Ivoire Tech Scale Up"}
            {" · "}
            {org.statut === "validee" ? "fiche validée" : org.statut === "en_attente" ? "en attente de validation" : "suspendue"}
          </p>
        </div>

        <dl className="grid gap-x-8 gap-y-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
          {fiche.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] font-semibold tracking-wide text-pierre uppercase">{k}</dt>
              <dd className="mt-0.5 text-[15px] text-encre">
                {v ?? <span className="text-brume">non renseigné</span>}
              </dd>
            </div>
          ))}
        </dl>

        <p className="border-t border-vert/10 bg-papier px-6 py-3 text-sm text-ardoise">
          {renseignes} champ{renseignes > 1 ? "s" : ""} sur {fiche.length} renseigné
          {renseignes > 1 ? "s" : ""}.{" "}
          {renseignes < fiche.length
            ? "Les champs manquants viennent d'une candidature incomplète — ils seront bientôt modifiables ici."
            : "Votre fiche est complète."}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-vert/10">
        <h2 className="text-lg font-semibold text-encre">Votre candidature</h2>
        {dossier ? (
          <>
            <p className="mt-2 text-[15px] text-ardoise">
              Déposée le{" "}
              <b className="text-encre">
                {dossier.deposeeLe ? dossier.deposeeLe.toLocaleDateString("fr-FR") : "date non renseignée"}
              </b>{" "}
              · <b className="text-encre">{nbChamps}</b> réponses conservées.
            </p>
            <p className="mt-3 rounded-xl border-l-4 border-orange bg-orange/5 px-4 py-3 text-sm text-graphite">
              Elle est conservée telle que vous l&apos;avez signée et ne change plus. Les
              corrections se font sur{" "}
              <Link href={`${base}/fiche`} className="font-medium text-vert underline">
                votre fiche
              </Link>
              .
            </p>
          </>
        ) : (
          <p className="mt-2 text-[15px] text-pierre">Aucune candidature importée pour le moment.</p>
        )}
      </section>
    </div>
  );
}
