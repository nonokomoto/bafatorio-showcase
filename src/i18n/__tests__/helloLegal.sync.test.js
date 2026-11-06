/**
 * Teste de sincronização dos documentos legais publicados na landing.
 *
 * `hello.bafatorio.com/terms`, `/privacy` e `/cookies` servem uma cópia dos
 * mesmos JSON que a aplicação mostra. A landing é um bundle isolado e não pode
 * importar da app, por isso a cópia é deliberada — mas nada além deste teste
 * impede a app de atualizar os termos e o site público continuar a publicar a
 * versão antiga, que é exposição legal, não dívida técnica.
 *
 * O contrato é igualdade total: qualquer divergência tem de ser uma decisão
 * explícita de quem a introduz.
 */
import helloEn from '../../../sites/hello-bafatorio/src/i18n/locales/legal/en-US.json';
import helloFr from '../../../sites/hello-bafatorio/src/i18n/locales/legal/fr-FR.json';
import helloPt from '../../../sites/hello-bafatorio/src/i18n/locales/legal/pt-PT.json';
import { LEGAL_PAGES } from '../../../sites/hello-bafatorio/src/legalRoutes.js';
import appEn from '../locales/en-US/legal.json';
import appFr from '../locales/fr-FR/legal.json';
import appPt from '../locales/pt-PT/legal.json';

const LOCALES = [
  ['pt-PT', appPt, helloPt],
  ['en-US', appEn, helloEn],
  ['fr-FR', appFr, helloFr],
];

describe('landing legal ≡ app legal', () => {
  test.each(LOCALES)('%s: documentos idênticos', (_locale, app, hello) => {
    expect(hello).toEqual(app);
  });

  test.each(LOCALES)('%s: cada rota publicada tem documento', (_locale, _app, hello) => {
    // Cada entrada de legalRoutes.js resolve o documento pela sua id; uma
    // renomeação de chave do lado da app deixaria a rota sem conteúdo.
    expect(LEGAL_PAGES.length).toBe(3);
    for (const { id } of LEGAL_PAGES) {
      expect(typeof hello[id]?.title).toBe('string');
      expect(Object.keys(hello[id].sections).length).toBeGreaterThan(0);
    }
  });
});
