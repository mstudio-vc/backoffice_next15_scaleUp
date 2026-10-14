import { PROGRAMME } from "@/lib/vocabulaire";

/**
 * TOUS les courriels de la plateforme sont décrits ici.
 *
 * Un modèle rend à la fois une version texte et une version HTML : certains clients de
 * messagerie n'affichent pas le HTML, et un lien d'activation ne doit jamais devenir
 * inatteignable à cause de ça.
 */
export type Courriel = { sujet: string; texte: string; html: string };

const VERT = "#064534";
const ORANGE = "#ec6726";
const CREME = "#faf7f0";
const ENCRE = "#0e1a16";
const ARDOISE = "#4f5b56";

function echapper(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Enveloppe commune : un seul endroit décrit à quoi ressemble un courriel de la plateforme.
 *
 * Les styles sont en ligne, et la mise en page repose sur un tableau : c'est laid à écrire,
 * mais c'est le seul HTML que les clients de messagerie rendent de la même façon.
 */
function enveloppe(titre: string, corps: string): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${echapper(titre)}</title></head>
<body style="margin:0;padding:24px 12px;background:${CREME};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${ENCRE};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px -20px rgba(6,69,52,.5);">
    <tr><td style="height:6px;background:linear-gradient(90deg,${VERT} 0 33.33%,#ffffff 33.33% 66.66%,${ORANGE} 66.66% 100%);"></td></tr>
    <tr><td style="padding:28px 32px 8px;">
      <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${ARDOISE};">
        Ministère de la Transition Numérique et de l'Innovation Technologique
      </p>
      <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:${VERT};">
        ${echapper(PROGRAMME.next15)} &middot; ${echapper(PROGRAMME.scaleup)}
      </p>
    </td></tr>
    <tr><td style="padding:12px 32px 32px;font-size:15px;line-height:1.6;">${corps}</td></tr>
    <tr><td style="padding:16px 32px 24px;border-top:1px solid #e6e3da;font-size:12px;color:${ARDOISE};">
      Message automatique — merci de ne pas y répondre.
    </td></tr>
  </table>
</body></html>`;
}

function bouton(url: string, libelle: string): string {
  return `<p style="margin:24px 0;"><a href="${echapper(url)}" style="display:inline-block;background:${VERT};color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:12px;">${echapper(libelle)}</a></p>
<p style="margin:0;font-size:13px;color:${ARDOISE};">Si le bouton ne fonctionne pas, copiez ce lien :<br><span style="word-break:break-all;">${echapper(url)}</span></p>`;
}

/** Ouverture d'un accès : le destinataire choisit son mot de passe. */
export function invitation(nom: string | null, lien: string, heures: number): Courriel {
  const bonjour = nom ? `Bonjour ${nom},` : "Bonjour,";
  return {
    sujet: "Votre accès à la plateforme Ivoire Tech",
    texte: [
      bonjour,
      "",
      "Un accès vient d'être ouvert pour vous sur la plateforme des lauréats",
      "Ivoire Tech Next 15 et Scale Up.",
      "",
      "Définissez votre mot de passe ici :",
      lien,
      "",
      `Ce lien est valable ${heures} heures et ne sert qu'une fois.`,
      "",
      "Si vous n'attendiez pas ce message, ignorez-le : aucun compte ne sera activé.",
    ].join("\n"),
    html: enveloppe(
      "Votre accès à la plateforme Ivoire Tech",
      `<p style="margin:0 0 12px;">${echapper(bonjour)}</p>
       <p style="margin:0;">Un accès vient d'être ouvert pour vous sur la plateforme des lauréats.
       Choisissez votre mot de passe pour activer votre compte.</p>
       ${bouton(lien, "Définir mon mot de passe")}
       <p style="margin:20px 0 0;font-size:13px;color:${ARDOISE};">
         Ce lien est valable ${heures} heures et ne sert qu'une fois.
         Si vous n'attendiez pas ce message, ignorez-le : aucun compte ne sera activé.
       </p>`,
    ),
  };
}

/** Réponse d'un partenaire à une demande d'offre. */
export function reponseDemande(
  organisation: string,
  offre: string,
  partenaire: string,
  acceptee: boolean,
): Courriel {
  const verdict = acceptee ? "acceptée" : "refusée";
  return {
    sujet: `Votre demande « ${offre} » a été ${verdict}`,
    texte: [
      `Bonjour,`,
      "",
      `La demande de ${organisation} pour l'offre « ${offre} » proposée par ${partenaire}`,
      `a été ${verdict}.`,
      "",
      acceptee
        ? "Le partenaire vous recontactera pour la mise en œuvre."
        : "Vous pouvez consulter les autres offres depuis votre espace.",
    ].join("\n"),
    html: enveloppe(
      `Demande ${verdict}`,
      `<p style="margin:0 0 12px;">Bonjour,</p>
       <p style="margin:0;">La demande de <b>${echapper(organisation)}</b> pour l'offre
       « ${echapper(offre)} », proposée par ${echapper(partenaire)}, a été
       <b style="color:${acceptee ? VERT : ORANGE};">${verdict}</b>.</p>
       <p style="margin:16px 0 0;">${
         acceptee
           ? "Le partenaire vous recontactera pour la mise en œuvre."
           : "Vous pouvez consulter les autres offres depuis votre espace."
       }</p>`,
    ),
  };
}
