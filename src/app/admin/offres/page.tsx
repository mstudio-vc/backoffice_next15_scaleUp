import Link from "next/link";
import { revalidatePath } from "next/cache";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { demandesOffres, journal, offres, organisations } from "@/db/schema";
import { exigerRoot } from "@/lib/garde";
import { CarteTable, EntetePage, TD, TH, TR, Vide } from "@/components/page-entete";
import { CATEGORIE_OFFRE, CIBLE_OFFRE } from "@/lib/vocabulaire";
import { Badge, Pilule } from "@/components/badge";
import { ExportCsv } from "@/components/export-csv";

export default async function AdminOffres({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>;
}) {
  await exigerRoot();
  const { categorie } = await searchParams;

  const [toutes, [attente]] = await Promise.all([
    db
      .select({
        offre: offres,
        partenaire: organisations.denominationSociale,
        demandes: sql<number>`count(${demandesOffres.id})`.as("demandes"),
      })
      .from(offres)
      .innerJoin(organisations, eq(organisations.id, offres.partenaireId))
      .leftJoin(demandesOffres, eq(demandesOffres.offreId, offres.id))
      .groupBy(offres.id, organisations.denominationSociale)
      .orderBy(desc(offres.creeLe)),
    db
      .select({ n: sql<number>`count(*)` })
      .from(demandesOffres)
      .where(eq(demandesOffres.statut, "envoyee")),
  ]);

  // Le filtre se pose en mémoire : la liste tient en quelques dizaines de lignes, et un
  // deuxième aller-retour en base pour trancher sur une colonne déjà chargée coûterait plus
  // qu'il ne rapporte. Les effectifs par catégorie doivent de toute façon être tous comptés.
  const actif = categorie && categorie in CATEGORIE_OFFRE ? categorie : null;
  const lignes = actif ? toutes.filter((l) => l.offre.categorie === actif) : toutes;

  // Seules les catégories réellement représentées : un filtre qui ne ramène rien est un piège.
  const categories = (Object.keys(CATEGORIE_OFFRE) as (keyof typeof CATEGORIE_OFFRE)[])
    .map((c) => ({ cle: c, n: toutes.filter((l) => l.offre.categorie === c).length }))
    .filter((c) => c.n > 0);

  async function basculer(formData: FormData) {
    "use server";
    const session = await exigerRoot();
    const id = String(formData.get("offreId"));
    const vers = formData.get("vers") === "publiee" ? "publiee" : "retiree";
    await db.update(offres).set({ statut: vers, misAJourLe: new Date() }).where(eq(offres.id, id));
    await db.insert(journal).values({
      utilisateurId: session.utilisateurId,
      action: vers === "retiree" ? "offre.retiree" : "offre.republiee",
      cible: id,
    });
    revalidatePath("/admin/offres");
  }

  return (
    <>
      <EntetePage
        titre="Offres"
        etat={`${toutes.length} offre${toutes.length > 1 ? "s" : ""} · ${Number(attente.n)} demande${
          Number(attente.n) > 1 ? "s" : ""
        } en attente${actif ? ` · ${lignes.length} affichée${lignes.length > 1 ? "s" : ""}` : ""}`}
        action={{ href: "/admin/offres/nouvelle", label: "Publier une offre" }}
      />

      {categories.length > 1 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Link
            href="/admin/offres"
            className={`rounded px-2.5 py-1 text-base ${
              actif ? "text-ardoise hover:bg-papier" : "bg-vert font-bold text-white"
            }`}
          >
            Toutes <span className="ml-1.5 opacity-70">{toutes.length}</span>
          </Link>
          {categories.map((c) => (
            <Link
              key={c.cle}
              href={`/admin/offres?categorie=${c.cle}`}
              className={`rounded px-2.5 py-1 text-base ${
                actif === c.cle ? "bg-vert font-bold text-white" : "text-ardoise hover:bg-papier"
              }`}
            >
              {CATEGORIE_OFFRE[c.cle]} <span className="ml-1.5 opacity-70">{c.n}</span>
            </Link>
          ))}
          <span className="ml-auto">
            <ExportCsv quoi="offres" label="Exporter les offres" />
          </span>
        </div>
      ) : null}

      {/* Le chiffre est déjà dans la ligne d'état : il ne lui faut qu'un chemin, pas un encart. */}
      {Number(attente.n) > 0 ? (
        <Link
          href="/admin/offres/demandes"
          className="mb-3 inline-block text-base font-normal text-orange-sombre hover:underline"
        >
          Traiter les {Number(attente.n)} demande{Number(attente.n) > 1 ? "s" : ""} →
        </Link>
      ) : null}

      {lignes.length === 0 ? (
        <Vide
          titre={actif ? "Aucune offre dans cette catégorie" : "Aucune offre publiée"}
          action={
            actif
              ? { href: "/admin/offres", label: "Voir toutes les offres" }
              : { href: "/admin/offres/nouvelle", label: "Publier la première" }
          }
        />
      ) : (
        /* En liste, comme côté lauréat : un même partenaire publie plusieurs offres — une
           voiture, une moto, une borne — et des cartes les éloignent au lieu de les comparer. */
        <CarteTable>
          <thead>
            <tr>
              <th className={TH}>Offre</th>
              <th className={TH}>Avantage</th>
              <th className={TH}>Pour qui</th>
              <th className={`${TH} text-right`}>Demandes</th>
              <th className={TH}>Jusqu&apos;au</th>
              <th className={TH}>État</th>
              <th className={`${TH} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map(({ offre, partenaire, demandes }) => (
              <tr key={offre.id} className={TR}>
                <td className={TD}>
                  <span className="font-bold text-encre">{offre.titre}</span>
                  <span className="block text-sm text-pierre">{partenaire}</span>
                </td>
                <td className={TD}>
                  <Pilule>{CATEGORIE_OFFRE[offre.categorie]}</Pilule>
                </td>
                <td className={`${TD} text-sm text-ardoise`}>{CIBLE_OFFRE[offre.cible]}</td>
                <td className={`${TD} text-right tabular-nums`}>
                  {Number(demandes) > 0 ? (
                    <Link href="/admin/offres/demandes" className="text-vert hover:underline">
                      {Number(demandes)}
                    </Link>
                  ) : (
                    <span className="text-pierre">—</span>
                  )}
                </td>
                <td className={`${TD} text-sm text-ardoise tabular-nums`}>
                  {offre.valideJusquAu
                    ? new Date(offre.valideJusquAu).toLocaleDateString("fr-FR")
                    : "—"}
                </td>
                <td className={TD}>
                  <Badge ton={offre.statut === "publiee" ? "succes" : "inactif"}>
                    {offre.statut === "publiee" ? "Publiée" : "Retirée"}
                  </Badge>
                </td>
                <td className={`${TD} text-right`}>
                  <form action={basculer}>
                    <input type="hidden" name="offreId" value={offre.id} />
                    <input
                      type="hidden"
                      name="vers"
                      value={offre.statut === "publiee" ? "retiree" : "publiee"}
                    />
                    <button className="rounded border border-brume px-3 py-1 text-sm font-normal text-graphite transition hover:bg-papier">
                      {offre.statut === "publiee" ? "Retirer" : "Republier"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </CarteTable>
      )}
    </>
  );
}
