import { buildWelcomeEmail } from './welcomeEmail';

describe('buildWelcomeEmail', () => {
  test('builds Portuguese content with the lead name', () => {
    const email = buildWelcomeEmail({ locale: 'pt-PT', name: 'Maria Santos' });

    expect(email.subject).toBe('Estás na lista de acesso antecipado ao Bafatório');
    expect(email.text).toContain('Olá Maria Santos');
    expect(email.text).toContain('Obrigado pelo teu interesse');
    expect(email.html).toContain('Maria Santos');
    expect(email.html).toContain('<!DOCTYPE html');
    expect(email.html).toContain('brand/bafatorio.png');
    expect(email.html).toContain('alt="Bafatório"');
  });

  test('builds English content for en-US', () => {
    const email = buildWelcomeEmail({ locale: 'en-US', name: 'Maria Santos' });

    expect(email.subject).toBe("You're on the Bafatório early-access list");
    expect(email.text).toContain('Hi Maria Santos');
  });

  test('builds French content for fr-FR', () => {
    const email = buildWelcomeEmail({ locale: 'fr-FR', name: 'Maria Santos' });

    expect(email.subject).toBe("Vous êtes sur la liste d'accès anticipé à Bafatório");
    expect(email.text).toContain('Bonjour Maria Santos');
  });

  test('falls back to Portuguese for an unknown locale', () => {
    const email = buildWelcomeEmail({ locale: 'de-DE', name: 'Max' });

    expect(email.subject).toBe('Estás na lista de acesso antecipado ao Bafatório');
  });

  test('escapes HTML-significant characters in the name to prevent injection', () => {
    const email = buildWelcomeEmail({
      locale: 'pt-PT',
      name: '<script>alert(1)</script>',
    });

    expect(email.html).not.toContain('<script>alert(1)</script>');
    expect(email.html).toContain('&lt;script&gt;');
    // The plain-text part keeps the raw name (no HTML context there).
    expect(email.text).toContain('<script>alert(1)</script>');
  });
});
