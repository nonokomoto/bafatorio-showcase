import { useRef } from 'react';
import PropTypes from 'prop-types';
import { FiCheck, FiDroplet } from 'react-icons/fi';
import { FieldLabel } from '../UI';
import { SCHEDULE_COLORS, SCHEDULE_COLOR_NAMES } from '../../Utils/scheduleColors';

// Num radiogroup as setas movem a selecção, não o Tab (WAI-ARIA). Baixo/direita
// avançam, cima/esquerda recuam, e dá a volta nas pontas.
const ARROW_STEP = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

const ScheduleColorPicker = ({ value, onChange, label, t }) => {
  const swatchRefs = useRef([]);

  // Roving tabindex: o grupo é UM tabstop. Sem isto, chegar ao campo seguinte
  // obrigava a passar por todas as cores.
  const selectedIndex = SCHEDULE_COLORS.indexOf(value);
  // Cor fora da paleta (entrada legada, ou default por gravar): o primeiro
  // swatch fica com o tabstop para o grupo não ficar inalcançável por teclado.
  const activeIndex = selectedIndex === -1 ? 0 : selectedIndex;

  const handleKeyDown = (e) => {
    const step = ARROW_STEP[e.key];
    if (!step) return;
    // Sem isto a seta rola a página por baixo do picker.
    e.preventDefault();

    const next = (activeIndex + step + SCHEDULE_COLORS.length) % SCHEDULE_COLORS.length;
    onChange(SCHEDULE_COLORS[next]);
    swatchRefs.current[next]?.focus();
  };

  return (
    <div className="group">
      <FieldLabel
        icon={<FiDroplet />}
        label={label}
        id="entry-color-label"
        className="group-hover:text-primary-600 dark:group-hover:text-primary-400"
      />
      <div
        role="radiogroup"
        aria-labelledby="entry-color-label"
        onKeyDown={handleKeyDown}
        className="flex flex-wrap gap-2"
      >
        {SCHEDULE_COLORS.map((color, index) => {
          const selected = value === color;
          const name = t(`schedule:form.colors.${SCHEDULE_COLOR_NAMES[color]}`);
          return (
            <button
              key={color}
              ref={(node) => { swatchRefs.current[index] = node; }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={name}
              title={name}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => onChange(color)}
              style={{ backgroundColor: color }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform
                focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2
                dark:focus:ring-offset-neutral-800
                ${selected ? 'scale-110 ring-2 ring-offset-2 ring-foreground dark:ring-offset-neutral-800' : 'hover:scale-105'}`}
            >
              {/* O check distingue a selecção sem depender só da cor — um
                  daltónico não lê "o azul está escolhido" pelo anel. */}
              {selected && <FiCheck className="text-white" size={16} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

ScheduleColorPicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  t: PropTypes.func.isRequired,
};

export default ScheduleColorPicker;
