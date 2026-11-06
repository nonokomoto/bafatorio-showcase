import { buildWelcomeEmail } from './emailContent';

describe('buildWelcomeEmail', () => {
  test('builds Portuguese content with the brand card and the user name embedded', () => {
    const email = buildWelcomeEmail({ locale: 'pt-PT', name: 'Ana' });

    expect(email.subject).toBe('Bem-vindo ao Bafatório, Ana!');
    expect(email.html).toContain('Ana');
    expect(email.html).toContain('<!DOCTYPE html');
    expect(email.html).toContain('brand/bafatorio.png');
    expect(email.html).toContain('alt="Bafatório"');
  });

  test('builds English content for en-US', () => {
    const email = buildWelcomeEmail({ locale: 'en-US', name: 'Ana' });

    expect(email.subject).toBe('Welcome to Bafatório, Ana!');
    expect(email.html).toContain('Ana');
  });

  test('builds French content for fr-FR', () => {
    const email = buildWelcomeEmail({ locale: 'fr-FR', name: 'Ana' });

    expect(email.subject).toBe('Bienvenue sur Bafatório, Ana!');
    expect(email.html).toContain('Ana');
  });

  test('falls back to Portuguese for an unknown or missing locale', () => {
    const email = buildWelcomeEmail({ locale: 'de-DE', name: 'Ana' });

    expect(email.subject).toBe('Bem-vindo ao Bafatório, Ana!');
  });

  test('escapes a user-supplied name so it cannot break out of the HTML markup', () => {
    const email = buildWelcomeEmail({ locale: 'pt-PT', name: '<img src=x onerror=alert(1)>' });

    expect(email.html).not.toContain('<img src=x onerror=alert(1)>');
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  test.each([
    ['pt-PT', 'Mensagem automática. Não responder.'],
    ['en-US', 'Automated message. Do not reply.'],
    ['fr-FR', 'Message automatique. Ne pas répondre.'],
  ])('footer for %s is the same transactional disclaimer used by the verification email', (locale, disclaimer) => {
    const email = buildWelcomeEmail({ locale, name: 'Ana' });

    expect(email.html).toContain(disclaimer);
    expect(email.html).not.toContain('Human Leaders');
  });

  test('uses the same brand card layout (logo over an accent rule) as the verification email', () => {
    const email = buildWelcomeEmail({ locale: 'pt-PT', name: 'Ana' });

    expect(email.html).toContain('border-bottom:2px solid #2d57f4');
    expect(email.html).toContain('border-radius:16px');
  });
});
