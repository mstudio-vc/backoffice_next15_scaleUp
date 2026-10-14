"use client";

import Link from "next/link";
import { useActionState } from "react";
import { lancerImport, type EtatImport } from "./actions";
import { BOUTON } from "@/components/champ";

export function FormulaireImport() {
  const [etat, action, enCours] = useActionState<EtatImport, FormData>(lancerImport, null);

  return (
    <>
      <form action={action} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-graphite">
            Exports de candidature (.xlsx)
          </span>
          <input
            type="file"
            name="fichiers"
            accept=".xlsx"
            multiple
            required
            className="rounded-xl border border-brume bg-white p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-papier file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-graphite"
          />
          <span className="text-xs text-pierre">
            Les deux fichiers peuvent être envoyés ensemble. Le programme est reconnu au nombre de
            colonnes, pas au nom du fichier.
          </span>
        </label>

        <div>
          <button className={BOUTON} disabled={enCours}>
            {enCours ? "Import en cours…" : "Importer"}
          </button>
        </div>
      </form>

      {etat ? (
        <div
          className={`mt-6 rounded-xl border-l-4 p-4 ${
            etat.ok ? "border-vert bg-feuille/5" : "border-orange bg-orange/5"
          }`}
        >
          <p className="font-semibold text-encre">{etat.resume}</p>
          {etat.lignes.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1 text-sm text-graphite">
              {etat.lignes.map((l) => (
                <li key={l} className="font-mono text-[13px]">{l}</li>
              ))}
            </ul>
          ) : null}
          {etat.ok ? (
            <Link
              href="/admin/organisations"
              className="mt-3 inline-block text-sm font-semibold text-vert hover:underline"
            >
              Voir les organisations à valider →
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
