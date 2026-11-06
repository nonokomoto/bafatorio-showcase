import { render, screen, fireEvent } from '@testing-library/react';

// setupTests.js mocka o barrel ../UI globalmente e só devolve Card/Button/Text/
// Table — qualquer outro componente vem undefined. Reponho o FieldLabel real,
// que é o que este componente usa.
jest.mock('../../UI', () => ({
  FieldLabel: jest.requireActual('../../UI/FieldLabel').default,
}));

// O mock global de react-icons/fi tem uma lista fixa que não inclui FiDroplet.
jest.mock('react-icons/fi', () => ({
  FiCheck: () => null,
  FiDroplet: () => null,
}));

import ScheduleColorPicker from '../ScheduleColorPicker';
import { SCHEDULE_COLORS, DEFAULT_SCHEDULE_COLOR } from '../../../Utils/scheduleColors';

// Devolve a chave i18n crua — o que interessa aqui é o comportamento, não a tradução.
const t = (key) => key;

const renderPicker = (value = DEFAULT_SCHEDULE_COLOR, onChange = jest.fn()) => {
  render(<ScheduleColorPicker value={value} onChange={onChange} label="Cor" t={t} />);
  return onChange;
};

describe('ScheduleColorPicker', () => {
  it('renders one radio per palette colour, with the selected one checked', () => {
    renderPicker('#D50000');

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(SCHEDULE_COLORS.length);
    expect(radios[SCHEDULE_COLORS.indexOf('#D50000')]).toBeChecked();
  });

  // Roving tabindex: um radiogroup é UM tabstop, não oito. Sem isto, chegar ao
  // campo seguinte com Tab obriga a passar por todas as cores.
  it('exposes exactly one tab stop', () => {
    renderPicker('#0B8043');

    const radios = screen.getAllByRole('radio');
    const tabbable = radios.filter((r) => r.getAttribute('tabindex') === '0');

    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBeChecked();
  });

  it('falls back to the first colour as tab stop when the value is unknown', () => {
    renderPicker('#NAOEXISTE');

    const radios = screen.getAllByRole('radio');
    expect(radios.filter((r) => r.getAttribute('tabindex') === '0')).toHaveLength(1);
    expect(radios[0]).toHaveAttribute('tabindex', '0');
  });

  describe('navegação por setas', () => {
    it.each([
      ['ArrowRight', '#039BE5', '#3F51B5'],
      ['ArrowDown', '#039BE5', '#3F51B5'],
      ['ArrowLeft', '#039BE5', '#0B8043'],
      ['ArrowUp', '#039BE5', '#0B8043'],
    ])('%s: de %s para %s', (key, from, expected) => {
      const onChange = renderPicker(from);

      fireEvent.keyDown(screen.getByRole('radiogroup'), { key });

      expect(onChange).toHaveBeenCalledWith(expected);
    });

    it('wraps do último para o primeiro', () => {
      const onChange = renderPicker(SCHEDULE_COLORS[SCHEDULE_COLORS.length - 1]);

      fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });

      expect(onChange).toHaveBeenCalledWith(SCHEDULE_COLORS[0]);
    });

    it('wraps do primeiro para o último', () => {
      const onChange = renderPicker(SCHEDULE_COLORS[0]);

      fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowLeft' });

      expect(onChange).toHaveBeenCalledWith(SCHEDULE_COLORS[SCHEDULE_COLORS.length - 1]);
    });

    it('move o foco com a selecção', () => {
      renderPicker('#039BE5');

      fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });

      expect(screen.getAllByRole('radio')[SCHEDULE_COLORS.indexOf('#3F51B5')]).toHaveFocus();
    });

    // Sem isto, a seta rola a página por baixo do picker.
    it('trava o scroll do browser nas setas', () => {
      renderPicker('#039BE5');

      const event = createKeyDown('ArrowRight');
      fireEvent(screen.getByRole('radiogroup'), event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('ignora teclas que não sejam setas', () => {
      const onChange = renderPicker('#039BE5');

      fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'a' });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('selects a colour on click', () => {
    const onChange = renderPicker('#039BE5');

    fireEvent.click(screen.getAllByRole('radio')[0]);

    expect(onChange).toHaveBeenCalledWith(SCHEDULE_COLORS[0]);
  });
});

function createKeyDown(key) {
  return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
}
