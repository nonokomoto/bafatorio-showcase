import { SCHEDULE_COLORS, SCHEDULE_COLOR_NAMES, DEFAULT_SCHEDULE_COLOR, isValidScheduleColor } from '../scheduleColors';
import ptPT from '../../i18n/locales/pt-PT/schedule.json';
import enUS from '../../i18n/locales/en-US/schedule.json';
import frFR from '../../i18n/locales/fr-FR/schedule.json';

describe('scheduleColors', () => {
  it('default is inside the palette', () => {
    expect(DEFAULT_SCHEDULE_COLOR).toBe('#039BE5');
    expect(SCHEDULE_COLORS).toContain(DEFAULT_SCHEDULE_COLOR);
  });

  it('accepts palette colours and rejects everything else', () => {
    expect(isValidScheduleColor('#D50000')).toBe(true);
    expect(isValidScheduleColor('#123456')).toBe(false);
    expect(isValidScheduleColor('#039be5')).toBe(false);
    expect(isValidScheduleColor(null)).toBe(false);
  });

  // Um swatch é um botão redondo sem texto: sem nome, o leitor de ecrã anuncia
  // "botão" oito vezes.
  it('every colour has a name for its accessible label', () => {
    for (const color of SCHEDULE_COLORS) {
      expect(SCHEDULE_COLOR_NAMES[color]).toBeDefined();
    }
    expect(Object.keys(SCHEDULE_COLOR_NAMES)).toHaveLength(SCHEDULE_COLORS.length);
  });

  describe.each([
    ['pt-PT', ptPT],
    ['en-US', enUS],
    ['fr-FR', frFR],
  ])('%s', (_locale, bundle) => {
    it('translates every colour name', () => {
      for (const color of SCHEDULE_COLORS) {
        const slug = SCHEDULE_COLOR_NAMES[color];
        expect(bundle.form.colors[slug]).toBeTruthy();
      }
    });

    it('has the new field labels', () => {
      expect(bundle.form.fields.color).toBeTruthy();
      expect(bundle.form.fields.participants).toBeTruthy();
      expect(bundle.form.placeholders.participants).toBeTruthy();
    });
  });
});
