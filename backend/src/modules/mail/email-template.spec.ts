import { renderEmailTemplate } from './email-template';

const links = {
  termsUrl: 'https://app.exemplo.com/termos',
  privacyUrl: 'https://app.exemplo.com/privacidade',
};

describe('renderEmailTemplate', () => {
  it('renderiza titulo, previa, botao e rodape com os links legais', () => {
    const html = renderEmailTemplate(
      {
        preview: 'Previa do e-mail',
        title: 'Confirme seu e-mail',
        greeting: 'Olá, Ana!',
        paragraphs: ['Primeiro paragrafo.', 'Segundo paragrafo.'],
        action: {
          label: 'Confirmar',
          url: 'https://app.exemplo.com/x#token=abc',
        },
        note: 'Se não foi você, ignore.',
      },
      links,
    );

    expect(html).toContain('<title>Confirme seu e-mail</title>');
    expect(html).toContain('Previa do e-mail');
    expect(html).toContain('Olá, Ana!');
    expect(html).toContain('href="https://app.exemplo.com/x#token=abc"');
    expect(html).toContain('Confirmar');
    expect(html).toContain('Se não foi você, ignore.');
    expect(html).toContain('href="https://app.exemplo.com/termos"');
    expect(html).toContain('href="https://app.exemplo.com/privacidade"');
    expect(html).toContain('alt="Money Marques"');
    expect(html).not.toContain('[');
  });

  it('omite botao e link secundario quando nao informados', () => {
    const html = renderEmailTemplate(
      { preview: 'p', title: 't', paragraphs: ['x'] },
      links,
    );
    expect(html).not.toContain('class="btn"');
  });

  it('escapa conteudo dinamico (sem injecao de HTML)', () => {
    const html = renderEmailTemplate(
      {
        preview: 'p',
        title: 't',
        greeting: 'Olá, <script>alert(1)</script>!',
        paragraphs: ['a & b'],
        action: { label: 'Ir', url: 'https://x.com/?a=1&b="2"' },
      },
      links,
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a &amp; b');
    expect(html).toContain('href="https://x.com/?a=1&amp;b=&quot;2&quot;"');
  });
});
