import "server-only";
import { createHash } from "node:crypto";

/**
 * L'hébergement des images de l'application, sur Cloudinary.
 *
 * POURQUOI PAS LE DISQUE DU SERVEUR. Les documents, eux, y sont stockés : ils sont
 * confidentiels et chaque lecture passe par une autorisation. Une couverture d'offre est
 * l'inverse — publique, lue à chaque affichage de la liste, et à redimensionner. La servir
 * depuis le serveur de l'application, c'est lui faire faire un métier qui n'est pas le sien,
 * sans cache, et grossir les sauvegardes avec des visuels.
 *
 * POURQUOI UN ENVOI SIGNÉ CÔTÉ SERVEUR. Cloudinary accepte aussi les envois « non signés »,
 * directement depuis le navigateur. Cela suppose d'exposer un nom de préréglage public : tout
 * visiteur peut alors déposer des images dans le compte. Ici le fichier passe par l'action de
 * serveur, qui le signe avec le secret — lequel ne quitte jamais le serveur — après avoir
 * vérifié son type et sa taille. Le fichier n'est jamais écrit sur le disque.
 *
 * L'APPLICATION FONCTIONNE SANS. Tant que les variables ne sont pas renseignées, le champ de
 * couverture n'est pas proposé et tout le reste marche : une offre n'a pas besoin d'image.
 * C'est le même parti que pour le courriel, qui retombe sur la console sans relais configuré.
 */

export const TAILLE_MAX_IMAGE = 5 * 1024 * 1024;

/** Les formats que les navigateurs affichent tous, et que Cloudinary sait retravailler. */
const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

type Config = { cloud: string; cle: string; secret: string };

function config(): Config | null {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const cle = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !cle || !secret) return null;
  return { cloud, cle, secret };
}

/** L'écran s'en sert pour proposer — ou non — le champ de couverture. */
export function hebergeurImages(): "cloudinary" | "absent" {
  return config() ? "cloudinary" : "absent";
}

/**
 * La signature attendue par Cloudinary : les paramètres triés par nom, en `clé=valeur` joints
 * par `&`, suivis du secret, le tout en SHA-1. Le secret n'est pas dans la requête : seul son
 * empreinte combinée y figure.
 */
export function signer(parametres: Record<string, string>, secret: string): string {
  const base = Object.keys(parametres)
    .sort()
    .map((k) => `${k}=${parametres[k]}`)
    .join("&");
  return createHash("sha1").update(base + secret).digest("hex");
}

/**
 * Un refus que NOUS écrivons. Il porte un CODE, et non une phrase : le code voyage dans
 * l'adresse après la redirection, et c'est l'écran qui choisit les mots. Faire transiter du
 * texte libre par l'URL permettrait de faire afficher n'importe quel message à un
 * administrateur, en lui envoyant simplement un lien.
 */
export type CodeRefusImage = "format" | "taille" | "envoi" | "absent";

export class RefusImage extends Error {
  constructor(readonly code: CodeRefusImage) {
    super(code);
  }
}

/** Les mots, en un seul endroit. */
export const MESSAGE_REFUS_IMAGE: Record<CodeRefusImage, string> = {
  format: "Formats acceptés : JPEG, PNG, WebP ou AVIF.",
  taille: `Image trop lourde : la limite est de ${TAILLE_MAX_IMAGE / 1024 / 1024} Mo.`,
  envoi: "L'image n'a pas pu être envoyée. Réessayez, ou publiez sans image.",
  absent: "L'hébergement d'images n'est pas configuré.",
};

/**
 * Téléverse une image et renvoie son URL.
 *
 * `dossier` range les visuels par usage dans le compte Cloudinary — « offres » aujourd'hui,
 * ce qui laisse la place aux logos d'organisation demain.
 */
export async function televerserImage(fichier: File, dossier: string): Promise<string> {
  const c = config();
  if (!c) throw new RefusImage("absent");
  if (!TYPES_ACCEPTES.includes(fichier.type)) throw new RefusImage("format");
  if (fichier.size > TAILLE_MAX_IMAGE) throw new RefusImage("taille");

  const horodatage = Math.floor(Date.now() / 1000).toString();
  const corps = new FormData();
  corps.set("file", fichier);
  corps.set("api_key", c.cle);
  corps.set("timestamp", horodatage);
  corps.set("folder", dossier);
  corps.set("signature", signer({ folder: dossier, timestamp: horodatage }, c.secret));

  const reponse = await fetch(`https://api.cloudinary.com/v1_1/${c.cloud}/image/upload`, {
    method: "POST",
    body: corps,
  });

  // Le détail technique part au journal du serveur ; l'écran reçoit une phrase (règle 11).
  if (!reponse.ok) {
    const brut = await reponse.text();
    console.error("[images] envoi refusé par Cloudinary", reponse.status, brut.slice(0, 400));
    throw new RefusImage("envoi");
  }

  const donnees = (await reponse.json()) as { secure_url?: string };
  if (!donnees.secure_url) {
    console.error("[images] réponse inattendue de Cloudinary", JSON.stringify(donnees).slice(0, 400));
    throw new RefusImage("envoi");
  }
  return donnees.secure_url;
}
