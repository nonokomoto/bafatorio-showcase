import { buildVerificationEmail, buildResetPasswordEmail } from './emailContent';

describe('buildVerificationEmail', () => {
  test('builds Portuguese content with the code placeholder embedded', () => {
    const email = buildVerificationEmail({ locale: 'pt-PT', codePlaceholder: '{####}' });

    expect(email.subject).toBe('O teu código para confirmar a conta Bafatório');
    expect(email.html).toContain('{####}');
    expect(email.html).toContain('<!DOCTYPE html');
    expect(email.html).toContain('brand/bafatorio.png');
    expect(email.html).toContain('alt="Bafatório"');
  });

  test('builds English content for en-US', () => {
    const email = buildVerificationEmail({ locale: 'en-US', codePlaceholder: '{####}' });

    expect(email.subject).toBe('Your Bafatório verification code');
    expect(email.html).toContain('{####}');
  });

  test('builds French content for fr-FR', () => {
    const email = buildVerificationEmail({ locale: 'fr-FR', codePlaceholder: '{####}' });

    expect(email.subject).toBe('Votre code de vérification Bafatório');
    expect(email.html).toContain('{####}');
  });

  test('falls back to Portuguese for an unknown or missing locale', () => {
    const email = buildVerificationEmail({ locale: 'de-DE', codePlaceholder: '{####}' });

    expect(email.subject).toBe('O teu código para confirmar a conta Bafatório');
  });

  test('never drops the Cognito code placeholder, since Cognito requires it verbatim in the response', () => {
    const email = buildVerificationEmail({ locale: 'en-US', codePlaceholder: '{####}' });

    expect(email.html.includes('{####}')).toBe(true);
  });

  test.each([
    ['pt-PT', 'Mensagem automática. Não responder.'],
    ['en-US', 'Automated message. Do not reply.'],
    ['fr-FR', 'Message automatique. Ne pas répondre.'],
  ])('footer for %s is a transactional-email disclaimer, not the waitlist partner tagline', (locale, disclaimer) => {
    const email = buildVerificationEmail({ locale, codePlaceholder: '{####}' });

    expect(email.html).toContain(disclaimer);
    expect(email.html).not.toContain('Human Leaders');
    expect(email.html).not.toContain('parceiro tecnológico');
  });
});

describe('buildResetPasswordEmail', () => {
  test('builds Portuguese content distinct from the verification email', () => {
    const email = buildResetPasswordEmail({ locale: 'pt-PT', codePlaceholder: '{####}' });

    expect(email.subject).toBe('Repor a password da conta Bafatório');
    expect(email.html).toContain('{####}');
    expect(email.subject).not.toBe(buildVerificationEmail({ locale: 'pt-PT', codePlaceholder: '{####}' }).subject);
  });

  test('builds English content for en-US', () => {
    const email = buildResetPasswordEmail({ locale: 'en-US', codePlaceholder: '{####}' });

    expect(email.subject).toBe('Reset your Bafatório password');
    expect(email.html).toContain('{####}');
  });

  test('builds French content for fr-FR', () => {
    const email = buildResetPasswordEmail({ locale: 'fr-FR', codePlaceholder: '{####}' });

    expect(email.subject).toBe('Réinitialiser le mot de passe Bafatório');
    expect(email.html).toContain('{####}');
  });

  test('falls back to Portuguese for an unknown or missing locale', () => {
    const email = buildResetPasswordEmail({ locale: undefined, codePlaceholder: '{####}' });

    expect(email.subject).toBe('Repor a password da conta Bafatório');
  });

  test.each([
    ['pt-PT', 'Mensagem automática. Não responder.'],
    ['en-US', 'Automated message. Do not reply.'],
    ['fr-FR', 'Message automatique. Ne pas répondre.'],
  ])('footer for %s is a transactional-email disclaimer, not the waitlist partner tagline', (locale, disclaimer) => {
    const email = buildResetPasswordEmail({ locale, codePlaceholder: '{####}' });

    expect(email.html).toContain(disclaimer);
    expect(email.html).not.toContain('Human Leaders');
    expect(email.html).not.toContain('parceiro tecnológico');
  });
});
