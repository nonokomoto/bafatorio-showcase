import { normalizeSupplierCategory } from './categoryMatching';

describe('normalizeSupplierCategory', () => {
  it('returns undefined for empty/absent input', () => {
    expect(normalizeSupplierCategory(undefined)).toBeUndefined();
    expect(normalizeSupplierCategory(null)).toBeUndefined();
    expect(normalizeSupplierCategory('')).toBeUndefined();
    expect(normalizeSupplierCategory('   ')).toBeUndefined();
  });

  it('passes through an already-canonical category', () => {
    expect(normalizeSupplierCategory('TRANSPORTATION')).toBe('TRANSPORTATION');
    expect(normalizeSupplierCategory('venue')).toBe('VENUE');
  });

  it('maps exact PT/EN/FR synonyms to the canonical category', () => {
    expect(normalizeSupplierCategory('Transporte')).toBe('TRANSPORTATION');
    expect(normalizeSupplierCategory('transport')).toBe('TRANSPORTATION');
    expect(normalizeSupplierCategory('Traiteur')).toBe('CATERING');
    expect(normalizeSupplierCategory('Espaço')).toBe('VENUE');
    expect(normalizeSupplierCategory('Lieu')).toBe('VENUE');
    expect(normalizeSupplierCategory('Divertissement')).toBe('ENTERTAINMENT');
    expect(normalizeSupplierCategory('Vinhos')).toBe('WINE');
  });

  it('matches a synonym embedded in a longer free-text phrase', () => {
    expect(normalizeSupplierCategory('Transporte 50 part')).toBe('TRANSPORTATION');
    expect(normalizeSupplierCategory('Fotografia do casamento')).toBe('PHOTOGRAPHY');
  });

  // Bug caught in PR #209 review: the per-token loop returned the FIRST
  // matching token instead of the most specific one, so a generic bucket
  // word appearing before a specific one won the match.
  it('prefers the most specific token match over a generic bucket word', () => {
    expect(normalizeSupplierCategory('Serviços de Fotografia')).toBe('PHOTOGRAPHY');
    expect(normalizeSupplierCategory('Serviços de Vídeo')).toBe('VIDEOGRAPHY');
  });

  it('corrects a typo via the Levenshtein fallback', () => {
    expect(normalizeSupplierCategory('Trasnporte')).toBe('TRANSPORTATION');
    expect(normalizeSupplierCategory('Catring')).toBe('CATERING');
  });

  it('passes through an unmatched category uppercased instead of guessing', () => {
    expect(normalizeSupplierCategory('Pyrotechnics')).toBe('PYROTECHNICS');
    expect(normalizeSupplierCategory('  security  ')).toBe('SECURITY');
  });

  // Bug caught in PR #209 review: the fuzzy fallback matched unrelated short
  // words against short candidates (foto, cake, vin, local, video...),
  // silently rewriting categories that have nothing to do with the match.
  it('does not fuzzy-match unrelated short words to a canonical category', () => {
    expect(normalizeSupplierCategory('Moto Táxi')).toBe('MOTO TÁXI');
    expect(normalizeSupplierCategory('Café')).toBe('CAFÉ');
    expect(normalizeSupplierCategory('Van')).toBe('VAN');
    expect(normalizeSupplierCategory('Cave')).toBe('CAVE');
    expect(normalizeSupplierCategory('Vidros')).toBe('VIDROS');
    expect(normalizeSupplierCategory('Fato')).toBe('FATO');
    expect(normalizeSupplierCategory('Loja')).toBe('LOJA');
    expect(normalizeSupplierCategory('Wood')).toBe('WOOD');
    expect(normalizeSupplierCategory('A')).toBe('A');
  });

  // Narrower version of the same bug, caught by nonokomoto post-merge
  // (issue #212 item 1): 5-6 char candidates still passed at distance 1.
  it('does not fuzzy-match unrelated 5-6 char words to a canonical category', () => {
    expect(normalizeSupplierCategory('Vidro')).toBe('VIDRO');
    expect(normalizeSupplierCategory('Vocal')).toBe('VOCAL');
    expect(normalizeSupplierCategory('Bateau')).toBe('BATEAU');
  });

  // Bug caught in PR #209 review: rows come from JSON.parse of the LLM
  // normalizer output, so a numeric category code must not crash the caller.
  it('coerces a non-string input instead of throwing', () => {
    expect(normalizeSupplierCategory(2024 as unknown as string)).toBe('2024');
  });
});
