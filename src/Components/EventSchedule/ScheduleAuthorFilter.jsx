import { memo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import ScheduleAuthorAvatar from './ScheduleAuthorAvatar';

/**
 * A fila de avatares É o filtro — não há painel nem menu: a pessoa está no
 * ecrã e clica-se-lhe. Cada avatar é um toggle (aria-pressed) que esconde ou
 * mostra as entradas desse autor no calendário de quem olha.
 *
 * Vista, não permissão: o backend já decidiu o que este utilizador pode ver;
 * isto só limpa o ecrã dele. Vive em EventSchedule/ e não em UI/ porque o
 * setupTests mocka o barrel UI/ globalmente.
 */
const ScheduleAuthorFilter = memo(({ authors, hiddenAuthorIds, onToggleAuthor }) => {
  const { t } = useTranslation('schedule');

  // Um avatar sozinho não filtra nada — escondê-lo esconderia a agenda
  // inteira. O controlo só existe quando tem trabalho para fazer.
  if (authors.length < 2) return null;

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={t('authorFilter.label')}>
      {authors.map((author) => {
        const visible = !hiddenAuthorIds.has(author.userId);
        const displayName = author.name || t('authorFilter.unknownAuthor');
        return (
          <button
            key={author.userId}
            type="button"
            aria-pressed={visible}
            title={displayName}
            aria-label={
              visible
                ? t('authorFilter.hideAuthor', { name: displayName })
                : t('authorFilter.showAuthor', { name: displayName })
            }
            onClick={() => onToggleAuthor(author.userId)}
            className={[
              'flex rounded-full flex-shrink-0 ring-2 ring-card transition-[opacity,filter]',
              visible ? '' : 'opacity-35 grayscale',
            ].join(' ')}
          >
            <ScheduleAuthorAvatar
              userId={author.userId}
              name={author.name}
              className="w-8 h-8 text-xs"
            />
          </button>
        );
      })}
    </div>
  );
});

ScheduleAuthorFilter.displayName = 'ScheduleAuthorFilter';

ScheduleAuthorFilter.propTypes = {
  authors: PropTypes.arrayOf(
    PropTypes.shape({
      userId: PropTypes.string.isRequired,
      name: PropTypes.string,
    })
  ).isRequired,
  hiddenAuthorIds: PropTypes.instanceOf(Set).isRequired,
  onToggleAuthor: PropTypes.func.isRequired,
};

export default ScheduleAuthorFilter;
