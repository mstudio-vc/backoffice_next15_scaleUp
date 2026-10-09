import "server-only";
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// `promisify(scrypt)` perd la surcharge qui accepte des options ; on enveloppe à la main.
function scryptAsync(
  motDePasse: string,
  sel: Buffer,
  longueur: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(motDePasse, sel, longueur, options, (err, cle) => (err ? reject(err) : resolve(cle)));
  });
}

// Paramètres scrypt. N=2^15 demande 128·N·r = 33 Mo, au-dessus du `maxmem` par défaut de
// Node (32 Mo) — d'où le réglage explicite. Les paramètres sont stockés DANS l'empreinte,
// pour pouvoir les durcir plus tard sans invalider les mots de passe existants.
const N = 2 ** 15;
const r = 8;
const p = 1;
const KEYLEN = 32;
const MAXMEM = 64 * 1024 * 1024;

/** `scrypt$N$r$p$sel$empreinte`, le tout en base64url. */
export async function hacherMotDePasse(motDePasse: string): Promise<string> {
  const sel = randomBytes(16);
  const cle = await scryptAsync(motDePasse.normalize("NFKC"), sel, KEYLEN, {
    N,
    r,
    p,
    maxmem: MAXMEM,
  });
  return ["scrypt", N, r, p, sel.toString("base64url"), cle.toString("base64url")].join("$");
}

/**
 * Vérifie un mot de passe contre son empreinte.
 *
 * Comparaison à temps constant : une comparaison naïve laisserait fuir, par la durée, le
 * nombre d'octets corrects. Renvoie `false` sur une empreinte illisible plutôt que de lever —
 * un enregistrement corrompu ne doit pas se distinguer d'un mauvais mot de passe.
 */
export async function verifierMotDePasse(motDePasse: string, empreinte: string): Promise<boolean> {
  const parts = empreinte.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nStr, rStr, pStr, selB64, cleB64] = parts;
  const attendu = Buffer.from(cleB64, "base64url");
  try {
    const calcule = await scryptAsync(
      motDePasse.normalize("NFKC"),
      Buffer.from(selB64, "base64url"),
      attendu.length,
      { N: Number(nStr), r: Number(rStr), p: Number(pStr), maxmem: MAXMEM },
    );
    return calcule.length === attendu.length && timingSafeEqual(calcule, attendu);
  } catch {
    return false;
  }
}

/** Règles minimales, appliquées à la définition du mot de passe. */
export const LONGUEUR_MIN = 12;

export function motDePasseValide(v: string): boolean {
  return v.length >= LONGUEUR_MIN && /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v);
}
