/** Logo oficial usado nos e-mails (hospedado externamente: clientes de e-mail nao carregam arquivos locais). */
export const EMAIL_LOGO_URL =
  'https://i.postimg.cc/tCtthZ9z/logo-horizontal.png';

export interface EmailAction {
  label: string;
  url: string;
}

export interface EmailContent {
  /** Texto de previa exibido na caixa de entrada. */
  preview: string;
  title: string;
  greeting?: string;
  paragraphs: string[];
  action?: EmailAction;
  /** Hyperlink secundario abaixo do botao: o proprio rotulo e o link (ex.: "Esqueceu a senha?"). */
  secondaryLink?: EmailAction;
  /** Texto auxiliar (12-13 px) abaixo do botao. */
  note?: string;
}

export interface EmailLinks {
  termsUrl: string;
  privacyUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const FONT_TEXT = 'Inter,Arial,Helvetica,sans-serif';
const FONT_BRAND = "'Space Grotesk',Arial,Helvetica,sans-serif";

/**
 * Template HTML base de todos os e-mails (Design System v1: Cyber Finance).
 * Layout em tabelas e estilos inline para compatibilidade com clientes de
 * e-mail. Todo conteudo dinamico e escapado.
 */
export function renderEmailTemplate(
  content: EmailContent,
  links: EmailLinks,
): string {
  const lastIndex = content.paragraphs.length - 1;
  const paragraphs = content.paragraphs
    .map(
      (text, index) =>
        `<p style="margin:0 0 ${index === lastIndex ? 24 : 16}px 0;font-family:${FONT_TEXT};font-size:16px;line-height:1.5;color:#A7B0C5;">${escapeHtml(text)}</p>`,
    )
    .join('\n            ');

  const greeting = content.greeting
    ? `<p style="margin:0 0 16px 0;font-family:${FONT_TEXT};font-size:16px;line-height:1.5;color:#F5F7FF;">${escapeHtml(content.greeting)}</p>`
    : '';

  const action = content.action
    ? `<table role="presentation" class="btn-wrap" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
              <tr>
                <td align="center" style="border-radius:8px;background-color:#7C3AED;">
                  <a href="${escapeHtml(content.action.url)}" class="btn" style="display:inline-block;min-height:44px;line-height:44px;padding:0 24px;font-family:${FONT_TEXT};font-size:16px;font-weight:600;color:#F5F7FF;text-decoration:none;border-radius:8px;background-color:#7C3AED;">${escapeHtml(content.action.label)}</a>
                </td>
              </tr>
            </table>`
    : '';

  const secondary = content.secondaryLink
    ? `<p style="margin:0 0 16px 0;font-family:${FONT_TEXT};font-size:14px;line-height:1.5;color:#A7B0C5;"><a href="${escapeHtml(content.secondaryLink.url)}" style="color:#22D3EE;">${escapeHtml(content.secondaryLink.label)}</a></p>`
    : '';

  const note = content.note
    ? `<p style="margin:0;font-family:${FONT_TEXT};font-size:13px;line-height:1.5;color:#A7B0C5;">${escapeHtml(content.note)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(content.title)}</title>
<style>
  body { margin:0; padding:0; background-color:#0A0A12; }
  table { border-collapse:collapse; }
  a { color:#22D3EE; }
  .btn:hover { background-color:#6D28D9 !important; }
  @media only screen and (max-width:639px) {
    .container { width:100% !important; }
    .px { padding-left:16px !important; padding-right:16px !important; }
    .h1 { font-size:24px !important; }
    .card-pad { padding:24px !important; }
    .btn-wrap, .btn-wrap table { width:100% !important; }
    .btn { display:block !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#0A0A12;">

<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0A0A12;">
  ${escapeHtml(content.preview)}
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0A0A12;">
  <tr>
    <td align="center" class="px" style="padding:32px 16px;">
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

        <tr>
          <td align="left" style="padding:0 0 24px 0;">
            <img src="${EMAIL_LOGO_URL}" alt="Money Marques" style="display:block;border:0;outline:none;text-decoration:none;max-width:100%;height:auto;font-family:${FONT_BRAND};font-size:16px;color:#F5F7FF;">
          </td>
        </tr>

        <tr>
          <td class="card-pad" style="background-color:#121826;border:1px solid #29334A;border-radius:12px;padding:32px;">

            <h1 class="h1" style="margin:0 0 16px 0;font-family:${FONT_BRAND};font-size:28px;line-height:1.25;font-weight:700;color:#F5F7FF;">
              ${escapeHtml(content.title)}
            </h1>

            ${greeting}
            ${paragraphs}

            ${action}
            ${secondary}
            ${note}

          </td>
        </tr>

        <tr>
          <td style="padding:32px 0 0 0;">
            <p style="margin:0 0 8px 0;font-family:${FONT_TEXT};font-size:12px;line-height:1.5;color:#A7B0C5;">
              Este é um e-mail automático enviado pelo sistema Money Marques. Por favor, não responda a esta mensagem.
            </p>
            <p style="margin:0;font-family:${FONT_TEXT};font-size:12px;line-height:1.5;color:#A7B0C5;">
              <a href="${escapeHtml(links.termsUrl)}" style="color:#22D3EE;">Termos de Uso</a>
              &nbsp;·&nbsp;
              <a href="${escapeHtml(links.privacyUrl)}" style="color:#22D3EE;">Política de Privacidade</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>
`;
}
