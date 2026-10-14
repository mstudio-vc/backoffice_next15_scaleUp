import "server-only";
import { BrevoClient } from "@getbrevo/brevo";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "@/db/client";
import { journal } from "@/db/schema";
import type { Courriel } from "@/lib/courriel/modeles";

/**
 * Le seul point d'envoi de courriel de la plateforme.
 *
 * Tout passe par ici — ce qui donne gratuitement la trace au journal, le choix du transport
 * et la mise en forme commune. Aucun autre module n'appelle Brevo ni nodemailer.
 *
 * Trois transports, choisis dans cet ordre :
 *
 *   1. l'API HTTP de Brevo, si BREVO_API_KEY est défini ;
 *   2. le relais SMTP, si SMTP_HOST est défini ;
 *   3. la console, sinon.
 *
 * L'API passe avant le SMTP à dessein : sur un VPS mutualisé, le port 587 sortant est souvent
 * filtré, et un envoi en HTTPS ne s'en soucie pas. Le SMTP reste disponible pour qui préfère.
 *
 * La console n'est pas un pis-aller mais le mode de développement voulu : un lien d'activation
 * ne doit pas partir vers une vraie adresse pendant qu'on teste.
 */

export type Destinataire = { email: string; nom?: string | null };

export type Contexte = {
  utilisateurId?: string | null;
  organisationId?: string | null;
};

type Expediteur = { email: string; name?: string };

/** `MAIL_FROM` accepte « Nom <adresse> » ou une adresse nue. */
function expediteur(): Expediteur {
  const brut = (process.env.MAIL_FROM ?? "no-reply@ivoire.tech").trim();
  const m = /^(.*?)\s*<([^>]+)>$/.exec(brut);
  if (!m) return { email: brut };
  const nom = m[1].replace(/^"|"$/g, "").trim();
  return { email: m[2].trim(), ...(nom ? { name: nom } : {}) };
}

let brevo: BrevoClient | null = null;
let smtp: Transporter | null = null;

function clientBrevo(): BrevoClient | null {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) return null;
  brevo ??= new BrevoClient({ apiKey });
  return brevo;
}

function transportSmtp(): Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT ?? 587);
  smtp ??= nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return smtp;
}

/** Le transport retenu, pour le journal et pour `/api/health`. */
export function transportCourriel(): "brevo" | "smtp" | "console" {
  if (process.env.BREVO_API_KEY?.trim()) return "brevo";
  if (process.env.SMTP_HOST?.trim()) return "smtp";
  return "console";
}

/**
 * Envoie un courriel et le trace.
 *
 * Lève en cas d'échec : un lien d'activation qui ne part pas doit se voir, pas se perdre dans
 * un journal. L'appelant a déjà enregistré l'invitation, donc un « Renvoyer le lien » suffit à
 * rattraper.
 */
export async function envoyer(
  destinataire: Destinataire,
  courriel: Courriel,
  contexte: Contexte = {},
): Promise<void> {
  const transport = transportCourriel();
  const de = expediteur();

  try {
    if (transport === "brevo") {
      await clientBrevo()!.transactionalEmails.sendTransacEmail({
        sender: de,
        to: [{ email: destinataire.email, ...(destinataire.nom ? { name: destinataire.nom } : {}) }],
        subject: courriel.sujet,
        htmlContent: courriel.html,
        textContent: courriel.texte,
      });
    } else if (transport === "smtp") {
      await transportSmtp()!.sendMail({
        from: de.name ? `"${de.name}" <${de.email}>` : de.email,
        to: destinataire.email,
        subject: courriel.sujet,
        text: courriel.texte,
        html: courriel.html,
      });
    } else {
      console.info(
        [
          "",
          "── courriel non envoyé (aucun transport configuré) ──",
          `À     : ${destinataire.email}`,
          `Sujet : ${courriel.sujet}`,
          "",
          courriel.texte,
          "────────────────────────────────────────────────────",
          "",
        ].join("\n"),
      );
    }
  } catch (e) {
    await tracer("courriel.echec", destinataire, courriel, transport, contexte);
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Échec de l'envoi à ${destinataire.email} (${transport}) : ${detail}`);
  }

  await tracer("courriel.envoye", destinataire, courriel, transport, contexte);
}

/** La trace ne doit jamais faire échouer l'envoi : un courriel parti reste parti. */
async function tracer(
  action: string,
  destinataire: Destinataire,
  courriel: Courriel,
  transport: string,
  contexte: Contexte,
): Promise<void> {
  try {
    await db.insert(journal).values({
      utilisateurId: contexte.utilisateurId ?? null,
      organisationId: contexte.organisationId ?? null,
      action,
      cible: destinataire.email,
      details: { sujet: courriel.sujet, transport },
    });
  } catch (e) {
    console.error("[courriel] trace impossible", e);
  }
}
