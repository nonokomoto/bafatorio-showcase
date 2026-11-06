import { memo, useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Text, Button } from '../UI';
import { FiMapPin, FiClock, FiTruck, FiUserCheck, FiX, FiTrash2 } from 'react-icons/fi';
import { useClickOutside } from '../../Hook/useClickOutside';
import { useIsMobile } from '../../Hook/useIsMobile';
import { useEventRole } from '../../Hook/useEventRole';
import { useAuthz, billingGateReasonFromError, billingGateMessageKey } from '../../Hook/useAuthz';
import { useDeleteScheduleEntryMutation } from '../../Api/services/scheduleApi';
import { formatTimeLabel } from './scheduleUtils';
import ScheduleAuthorAvatar from './ScheduleAuthorAvatar';

const POPOVER_WIDTH = 300;
const GAP = 8;

// Uma linha de detalhe: ícone + label discreto por cima do valor. Dá hierarquia
// (label vs valor) e alinha com o padrão DetailRow do resto do site.
const DetailLine = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2.5">
    <Icon className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
    <div className="min-w-0">
      <Text variant="caption" className="block text-muted-foreground">{label}</Text>
      <Text variant="body2" className="text-foreground">{value}</Text>
    </div>
  </div>
);

DetailLine.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

// Anchors below the event; flips up if card exits viewport bottom.
// Left-aligns with event; right-aligns if card exits viewport right.
function computePosition(anchor, height) {
  let left = anchor.x;
  if (left + POPOVER_WIDTH > window.innerWidth - GAP) {
    left = anchor.x + anchor.width - POPOVER_WIDTH;
  }
  left = Math.max(GAP, left);

  let top = anchor.y + GAP;
  if (top + height > window.innerHeight - GAP) {
    top = anchor.y - height - GAP;
  }

  return { top, left };
}

const ScheduleEntryDetailPopover = memo(({ entry, anchor, onClose, onEdit }) => {
  const { t } = useTranslation('schedule');
  const ref = useRef(null);
  const isMobile = useIsMobile();
  const [position, setPosition] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteEntry, { isLoading: isDeleting, error: deleteError }] = useDeleteScheduleEntryMutation();

  // Per-entry permission gating (ADR-029). The popover knows the entry, so it
  // resolves edit/delete capability per row rather than relying on a coarse
  // flag from the parent.
  const { canEditScheduleEntry, canDeleteScheduleEntry } = useEventRole(entry?.eventId);
  // Evento read-only (billing, §4b): esconde editar/apagar como o RBAC faria.
  const { writable } = useAuthz(entry?.eventId);
  const canEdit = entry ? canEditScheduleEntry(entry.owner) && writable : false;
  const canDelete = entry ? canDeleteScheduleEntry(entry.owner) && writable : false;

  // Two-phase position: render off-screen first, measure height, then place correctly.
  // useLayoutEffect runs before paint — no visible flash. Skipped on mobile (no anchor positioning).
  useLayoutEffect(() => {
    if (isMobile || !ref.current || !anchor) return;
    setPosition(computePosition(anchor, ref.current.offsetHeight));
  }, [anchor, confirmingDelete, isMobile]);

  useClickOutside(ref, onClose);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (confirmingDelete) setConfirmingDelete(false);
        else onClose();
      }
    };
    document.addEventListener('keydown', onKey);

    // On mobile the backdrop prevents page scroll; don't close on scroll/resize.
    if (!isMobile) {
      const onScroll = () => onClose();
      const onResize = () => onClose();
      document.addEventListener('scroll', onScroll, { capture: true });
      window.addEventListener('resize', onResize);
      return () => {
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('scroll', onScroll, { capture: true });
        window.removeEventListener('resize', onResize);
      };
    }

    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, confirmingDelete, isMobile]);

  const handleEdit = useCallback(() => {
    onClose();
    onEdit(entry);
  }, [onClose, onEdit, entry]);

  const handleDeleteConfirm = useCallback(async () => {
    const result = await deleteEntry({ id: entry.id, eventId: entry.eventId });
    if (!result.error) onClose();
  }, [deleteEntry, entry, onClose]);

  if (!entry) return null;
  if (!isMobile && !anchor) return null;

  const timeLabel = formatTimeLabel(entry, t);
  const headerColor = entry.calendarColor;
  const deleteGateReason = billingGateReasonFromError(deleteError);

  const header = (
    <div
      className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 bg-primary-600 dark:bg-primary-700"
      style={headerColor ? { backgroundColor: headerColor } : undefined}
    >
      <Text variant="subtitle1" weight="semibold" className="leading-snug text-white">
        {entry.title}
      </Text>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors flex-shrink-0"
        aria-label={t('entryDetail.close')}
      >
        <FiX className="w-4 h-4" />
      </button>
    </div>
  );

  const hasDetails = entry.location || entry.supplierId || entry.participantNames?.length > 0;

  const body = (
    <div className="px-4 py-3.5 space-y-3.5">
      {/* Quando — meta primária, com mais peso que o resto */}
      <div>
        <div className="flex items-center gap-2.5">
          <FiClock className="w-4 h-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
          <Text variant="body2" weight="medium" className="text-foreground">{entry.date} · {timeLabel}</Text>
        </div>

        {/* O avatar do bloco é pequeno de mais para um nome — é aqui que ele
            ganha um. Numa agenda de um autor só a linha seria ruído, e num
            evento legado sem ownerName seria "Autor desconhecido" sem préstimo:
            só aparece quando há nome ou quando a fila de autores existe. */}
        {entry.authorId && (entry.authorName || entry.showAuthorAvatar) && (
          <div className="flex items-center gap-2.5 mt-2">
            <ScheduleAuthorAvatar
              userId={entry.authorId}
              name={entry.authorName}
              className="w-4 h-4 text-[0.55rem]"
            />
            <Text variant="caption" className="text-muted-foreground">
              {t('entryDetail.createdBy', {
                name: entry.authorName ?? t('authorFilter.unknownAuthor'),
              })}
            </Text>
          </div>
        )}
      </div>

      {/* Onde / com quem — cada detalhe com o label por cima do valor */}
      {hasDetails && (
        <div className="space-y-3 pt-3 border-t border-border">
          {entry.location && (
            <DetailLine icon={FiMapPin} label={t('entryDetail.location')} value={entry.location} />
          )}
          {entry.supplierId && (
            <DetailLine icon={FiTruck} label={t('entryDetail.supplier')} value={entry.supplierName ?? entry.supplierId} />
          )}
          {entry.participantNames?.length > 0 && (
            <DetailLine icon={FiUserCheck} label={t('entryDetail.participants')} value={entry.participantNames.join(', ')} />
          )}
        </div>
      )}

      {entry.description && (
        <div className="pt-3 border-t border-border">
          <Text variant="body2" className="whitespace-pre-wrap text-foreground leading-relaxed">
            {entry.description}
          </Text>
        </div>
      )}

      {confirmingDelete && (
        <div className="mt-2 pt-2 border-t border-border">
          <Text variant="body2" className="text-error-600 dark:text-error-400 mb-2">
            {t('entryDetail.deleteConfirm')}
          </Text>
          {deleteError && (
            <Text variant="caption" className="text-error-600 dark:text-error-400 mb-2">
              {deleteGateReason
                ? t(`common:${billingGateMessageKey(deleteGateReason)}`)
                : t('form.genericError')}
            </Text>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={isDeleting} onClick={() => setConfirmingDelete(false)}>
              {t('entryDetail.deleteCancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isDeleting}
              loading={isDeleting}
              onClick={handleDeleteConfirm}
              className="bg-error-600 hover:bg-error-700 dark:bg-error-700 dark:hover:bg-error-600"
            >
              {t('entryDetail.deleteConfirmButton')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const footer = !confirmingDelete && (
    <div className="flex justify-between items-center px-4 py-3 border-t border-border">
      {canDelete ? (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-950/30 transition-colors"
          aria-label={t('entryDetail.delete')}
        >
          <FiTrash2 className="w-4 h-4" />
        </button>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        {canEdit && (
          <Button variant="outline" size="sm" onClick={handleEdit}>
            {t('entryDetail.edit')}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('entryDetail.close')}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
        <div
          ref={ref}
          className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-2xl shadow-2xl border border-border animate-modal-slide-up overflow-hidden"
          role="dialog"
          aria-label={entry.title}
        >
          <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          {header}
          {body}
          {footer}
        </div>
      </>
    );
  }

  return (
    <div
      ref={ref}
      style={{
        width: POPOVER_WIDTH,
        top: position ? position.top : -9999,
        left: position ? position.left : -9999,
      }}
      className="fixed z-50 bg-card rounded-xl shadow-2xl border border-border animate-modal-fade overflow-hidden"
      role="dialog"
      aria-label={entry.title}
    >
      {header}
      {body}
      {footer}
    </div>
  );
});

ScheduleEntryDetailPopover.displayName = 'ScheduleEntryDetailPopover';

ScheduleEntryDetailPopover.propTypes = {
  entry: PropTypes.shape({
    id: PropTypes.string.isRequired,
    eventId: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    startTime: PropTypes.string,
    endTime: PropTypes.string,
    location: PropTypes.string,
    supplierId: PropTypes.string,
    supplierName: PropTypes.string,
    participantNames: PropTypes.arrayOf(PropTypes.string),
    calendarColor: PropTypes.string,
    description: PropTypes.string,
    owner: PropTypes.string,
    authorId: PropTypes.string,
    authorName: PropTypes.string,
    showAuthorAvatar: PropTypes.bool,
  }),
  anchor: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
  }),
  onClose: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
};

export default ScheduleEntryDetailPopover;
