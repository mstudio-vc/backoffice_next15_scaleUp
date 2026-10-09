import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Envoi de courriels.
 *
 * Sans `SMTP_HOST`, rien n'est envoyé : le message est écrit dans la console. C'est le mode de
 * développement voulu — un lien de définition de mot de passe ne doit pas partir par accident
 * vers une vraie adresse pendant qu'on teste.
 */
let transport: Transporter | null = null;

function obtenirTransport(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }
  return transport;
}

export async function envoyerCourriel(opts: {
  a: string;
  sujet: string;
  texte: string;
}): Promise<void> {
  const t = obtenirTransport();
  if (!t) {
    console.info(
      `\n── courriel non envoyé (SMTP_HOST absent) ──\nÀ      : ${opts.a}\nSujet  : ${opts.sujet}\n\n${opts.texte}\n───────────────────────────────────────────\n`,
    );
    return;
  }
  await t.sendMail({
    from: process.env.MAIL_FROM ?? "no-reply@ivoire.tech",
    to: opts.a,
    subject: opts.sujet,
    text: opts.texte,
  });
}

export function courrielInvitation(nom: string | null, lien: string, heures: number): string {
  return [
    `Bonjour${nom ? ` ${nom}` : ""},`,
    "",
    "Un accès vient d'être ouvert pour vous sur la plateforme Ivoire Tech",
    "(programmes Next 15 et Scale Up).",
    "",
    "Définissez votre mot de passe ici :",
    lien,
    "",
    `Ce lien est valable ${heures} heures et ne sert qu'une fois.`,
    "",
    "Si vous n'attendiez pas ce message, ignorez-le : aucun compte ne sera activé.",
  ].join("\n");
}
