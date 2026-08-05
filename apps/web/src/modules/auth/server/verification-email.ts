import { Resend } from "resend";

export type VerificationEmail = {
  email: string;
  url: string;
};

export type VerificationEmailSender = (message: VerificationEmail) => Promise<void>;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function createResendVerificationEmailSender(options: {
  apiKey: string;
  from: string;
}): VerificationEmailSender {
  const resend = new Resend(options.apiKey);

  return async ({ email, url }) => {
    const safeUrl = escapeHtml(url);
    const { error } = await resend.emails.send({
      from: options.from,
      to: email,
      subject: "Confirme seu email no Anki Miner",
      html: `<p>Confirme seu endereço para entrar no Anki Miner.</p><p><a href="${safeUrl}">Confirmar meu email</a></p><p>Se você não iniciou este cadastro, ignore esta mensagem.</p>`,
      text: `Confirme seu endereço para entrar no Anki Miner: ${url}\n\nSe você não iniciou este cadastro, ignore esta mensagem.`,
    });

    if (error) {
      throw new Error(`O Resend recusou o email de verificação: ${error.message}`);
    }
  };
}
