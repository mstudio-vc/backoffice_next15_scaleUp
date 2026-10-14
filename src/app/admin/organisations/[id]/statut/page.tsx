import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { demandesOffres, journal, offres, organisations, utilisateurs } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { Badge } from "@/components/badge";
import { BOUTON, BOUTON_CLAIR, BOUTON_DANGER } from "@/components/champ";
import { CarteFormulaire, Retour, Vide } from "@/components/page-entete";
import { STATUT_ORGANISATION, TON_STATUT_ORGANISATION } from "@/lib/vocabulaire";

/**
 * La confirmation d'un changement de statut.
 *
 * Elle n'existait pas : « Valider » et « Suspendre » étaient des boutons posés dans une grille
 * de 161 lignes, qui écrivaient au clic. C'est le cas que la règle 5 désigne nommément — le
 * piège n'est pas le formulaire, que tout le monde protège, c'est le bouton isolé.
 *
 * Elle est une PAGE et non un tiroir : l'adresse se partage et se recharge (règle 9). Et elle
 * annonce des conséquences CALCULÉES, pas une phrase générique : « Confirmer » ne confirme
 * rien, et un administrateur qui valide 155 dossiers mérite de savoir ce que son clic déclenche.
 */
const CIBLES = ["validee", "suspendue", "en_attente"] as const;
type Cible = (typeof CIBLES)[number];

const VERBE: Record<Cible, string> = {
  validee: "Valider",
  suspendue: "Suspendre",
  en_attente: "Remettre en attente",
};

export default async function ChangerStatut({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vers?: string }>;
}) {
  await exigerRoot();
  const { id } = await params;
  const { vers } = await searchParams;

  if (!vers || !CIBLES.includes(vers as Cible)) redirect(`/admin/organisations/${id}`);
  const cible = vers as Cible;

  const org = await db.query.organisations.findFirst({ where: eq(organisations.id, id) });
  if (!org) {
    return (
      <>
        <Retour href="/admin/organisations" label="Organisations" />
        <Vide
          titre="Cette organisation n'existe plus"
          action={{ href: "/admin/organisations", label: "Retour à la liste" }}
        />
      </>
    );
  }

  const fiche = `/admin/organisations/${id}`;

  // Les chiffres de la conséquence. Comptés EN SQL : un décompte tiré d'une page affichée
  // serait faux dès que la liste est paginée, et personne ne le verrait (règle 10).
  const [[comptes], [autresValidees], [laureatsValides], [offresPubliees], [demandesEnCours]] =
    await Promise.all([
      db
        .select({ total: count() })
        .from(utilisateurs)
        .where(and(eq(utilisateurs.organisationId, id), eq(utilisateurs.statut, "actif"))),
      db
        .select({ total: count() })
        .from(organisations)
        .where(and(eq(organisations.statut, "validee"), ne(organisations.id, id))),
      db
        .select({ total: count() })
        .from(organisations)
        .where(and(eq(organisations.statut, "validee"), ne(organisations.type, "partenaire"))),
      org.type === "partenaire"
        ? db
            .select({ total: count() })
            .from(offres)
            .where(and(eq(offres.partenaireId, id), eq(offres.statut, "publiee")))
        : Promise.resolve([{ total: 0 }]),
      db
        .select({ total: count() })
        .from(demandesOffres)
        .where(and(eq(demandesOffres.organisationId, id), eq(demandesOffres.statut, "envoyee"))),
    ]);

  const membresActifs = comptes.total;
  const estPartenaire = org.type === "partenaire";

  /** Ce qui va réellement se produire. Chaque phrase est vérifiable dans le code. */
  const consequences: string[] = [];
  if (cible === "validee") {
    consequences.push(
      `Elle apparaîtra dans l'annuaire, aux côtés des ${autresValidees.total} organisations déjà validées.`,
    );
    if (estPartenaire) {
      consequences.push(
        offresPubliees.total > 0
          ? `Ses ${offresPubliees.total} offre${offresPubliees.total > 1 ? "s" : ""} publiée${
              offresPubliees.total > 1 ? "s" : ""
            } deviendront visibles par les ${laureatsValides.total} lauréats validés, qui pourront en faire la demande.`
          : `Les offres qu'elle publiera deviendront visibles par les ${laureatsValides.total} lauréats validés.`,
      );
    }
    consequences.push("Réversible : vous pourrez la suspendre à tout moment.");
  } else if (cible === "suspendue") {
    consequences.push(
      org.statut === "validee"
        ? "Elle disparaîtra de l'annuaire."
        : "Elle n'apparaîtra pas dans l'annuaire.",
    );
    if (estPartenaire && offresPubliees.total > 0) {
      consequences.push(
        `Ses ${offresPubliees.total} offre${offresPubliees.total > 1 ? "s" : ""} publiée${
          offresPubliees.total > 1 ? "s" : ""
        } cesseront d'être visibles par les lauréats.`,
      );
    }
    if (membresActifs > 0) {
      consequences.push(
        `Ses ${membresActifs} compte${membresActifs > 1 ? "s" : ""} actif${
          membresActifs > 1 ? "s" : ""
        } gardent leur accès : suspendre l'organisation ne ferme pas les comptes. Pour cela, passez par Accès.`,
      );
    }
    if (demandesEnCours.total > 0) {
      consequences.push(
        `Ses ${demandesEnCours.total} demande${demandesEnCours.total > 1 ? "s" : ""} d'offre en cours ne ${
          demandesEnCours.total > 1 ? "sont" : "est"
        } pas annulée${demandesEnCours.total > 1 ? "s" : ""}.`,
      );
    }
    consequences.push("Réversible : vous pourrez la réactiver.");
  } else {
    consequences.push("Elle n'apparaîtra plus dans l'annuaire et retournera dans « À traiter ».");
  }

  async function appliquer() {
    "use server";
    const session = await exigerRoot();

    // L'état visé vient de l'URL, mais il est revérifié ici : l'affichage n'est pas une
    // autorisation, et une adresse se forge.
    if (!CIBLES.includes(cible)) return;

    await db
      .update(organisations)
      .set({ statut: cible, misAJourLe: new Date() })
      .where(eq(organisations.id, id));

    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      organisationId: id,
      action: `organisation.${cible}`,
      cible: org!.denominationSociale,
      details: { depuis: org!.statut },
    });

    revalidatePath("/admin/organisations");
    revalidatePath(fiche);
    redirect(fiche);
  }

  if (org.statut === cible) {
    return (
      <>
        <Retour href={fiche} label={org.denominationSociale} />
        <Vide
          titre={`Déjà ${STATUT_ORGANISATION[cible].toLowerCase()}`}
          texte="Rien à changer."
          action={{ href: fiche, label: "Retour à la fiche" }}
        />
      </>
    );
  }

  return (
    <>
      <Retour href={fiche} label={org.denominationSociale} />
      <h1 className="mb-1 text-2xl font-bold text-encre">
        {VERBE[cible]} {org.denominationSociale} ?
      </h1>
      <p className="mb-4 flex items-center gap-2 text-sm text-pierre">
        Actuellement
        <Badge ton={TON_STATUT_ORGANISATION[org.statut]}>
          {STATUT_ORGANISATION[org.statut]}
        </Badge>
      </p>

      <CarteFormulaire>
        <ul className="flex flex-col gap-2">
          {consequences.map((c) => (
            <li key={c} className="text-base text-graphite">
              {c}
            </li>
          ))}
        </ul>

        <form action={appliquer} className="mt-5 flex items-center gap-2 border-t border-brume pt-4">
          {/* Le libellé nomme l'acte. « Confirmer » ne confirme rien. */}
          <button className={cible === "validee" ? BOUTON : BOUTON_DANGER}>
            {VERBE[cible]} cette organisation
          </button>
          <Link href={fiche} className={BOUTON_CLAIR}>
            Annuler
          </Link>
        </form>
      </CarteFormulaire>
    </>
  );
}
