/**
 * Teste de sincronização da paleta da agenda.
 *
 * `src/Utils/scheduleColors.js` (frontend, picker) e
 * `amplify/function/shared/scheduleColors.ts` (backend, validação) são espelhos
 * da mesma paleta curada. Este teste falha se alguém mexer num lado sem o outro
 * — uma cor que o picker oferece e o validador rejeita é um erro que só aparece
 * ao gravar, já com o utilizador a olhar.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — módulo JS do frontend, sem declarações; só comparamos valores
import * as frontend from '../../../src/Utils/scheduleColors';
import * as backend from './scheduleColors';

describe('scheduleColors: frontend ≡ backend', () => {
  test('SCHEDULE_COLORS idênticas e pela mesma ordem', () => {
    expect(backend.SCHEDULE_COLORS).toEqual(frontend.SCHEDULE_COLORS);
  });

  test('DEFAULT_SCHEDULE_COLOR idêntico e dentro da paleta', () => {
    expect(backend.DEFAULT_SCHEDULE_COLOR).toBe('#039BE5');
    expect(backend.DEFAULT_SCHEDULE_COLOR).toBe(frontend.DEFAULT_SCHEDULE_COLOR);
    expect(backend.SCHEDULE_COLORS).toContain(backend.DEFAULT_SCHEDULE_COLOR);
  });

  test('isValidScheduleColor: mesmo veredicto nos dois lados', () => {
    const cases = [
      '#039BE5', // default
      '#D50000', // tomate
      '#8E24AA', // uva
      '#039be5', // minúsculas — a paleta é canónica em maiúsculas
      '#10B981', // success-500: reservado ao estado, fora da paleta
      '#ef4444', // error-500: idem
      '#123456', // hex bem-formado mas arbitrário
      'red',
      '',
      null,
      undefined,
    ];
    for (const value of cases) {
      expect(backend.isValidScheduleColor(value)).toBe(frontend.isValidScheduleColor(value));
    }
  });
});

describe('scheduleColors: a paleta em si', () => {
  test('aceita todas as cores da paleta', () => {
    for (const color of backend.SCHEDULE_COLORS) {
      expect(backend.isValidScheduleColor(color)).toBe(true);
    }
  });

  test('rejeita hex arbitrário fora da paleta', () => {
    expect(backend.isValidScheduleColor('#123456')).toBe(false);
    expect(backend.isValidScheduleColor('red')).toBe(false);
    expect(backend.isValidScheduleColor(null)).toBe(false);
  });

  // A paleta são hexes próprios. Se um deles calhar em cima de um token
  // semântico, um bloco da agenda passa a ler-se como estado (erro/sucesso) —
  // exactamente o que EventDetailsCard.jsx:67 reserva.
  test('nenhuma cor colide com os tokens semânticos', () => {
    const SEMANTIC = ['#10B981', '#EF4444', '#F59E0B'];
    const palette = backend.SCHEDULE_COLORS.map((c: string) => c.toUpperCase());
    for (const token of SEMANTIC) {
      expect(palette).not.toContain(token);
    }
  });
});
