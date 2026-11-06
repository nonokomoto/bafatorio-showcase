import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiMail, FiEdit2, FiTrash2 } from 'react-icons/fi';

const BulkActionBar = ({ selectedCount, permissions, writable = true, readOnlyTitle, onEmail, onEdit, onDelete }) => {
  const { t } = useTranslation('participant');

  if (selectedCount === 0) return null;

  // Editar/apagar participantes é escrita no evento (Lambdas gated pela
  // janela) — em read-only os botões desativam com o motivo no title.
  const writeDisabledProps = {
    disabled: !writable,
    title: !writable ? readOnlyTitle : undefined,
  };

  return (
    <div
      className="flex items-center justify-between px-6 py-2.5 animate-fade-in"
      style={{ backgroundColor: '#EEF2FF', borderBottom: '1px solid #C7D2FE' }}
    >
      <span className="text-[13px] font-medium" style={{ color: '#4338CA' }}>
        {t('participantsV2.bulkActions.selected', { count: selectedCount })}
      </span>

      <div className="flex items-center gap-2">
        {permissions?.canSendEmails && (
          <button
            onClick={onEmail}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ border: '1px solid #C7D2FE', backgroundColor: '#fff', color: '#4338CA' }}
          >
            <FiMail size={14} style={{ color: '#4338CA' }} />
            {t('participantsV2.bulkActions.email')}
          </button>
        )}

        {selectedCount === 1 && permissions?.canManageParticipants && (
          <button
            onClick={onEdit}
            {...writeDisabledProps}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ border: '1px solid #C7D2FE', backgroundColor: '#fff', color: '#4338CA' }}
          >
            <FiEdit2 size={14} style={{ color: '#4338CA' }} />
            {t('participantsV2.bulkActions.edit')}
          </button>
        )}

        {permissions?.canManageParticipants && (
          <button
            onClick={onDelete}
            {...writeDisabledProps}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2', color: '#DC2626' }}
          >
            <FiTrash2 size={14} style={{ color: '#DC2626' }} />
            {t('participantsV2.bulkActions.delete')}
          </button>
        )}
      </div>
    </div>
  );
};

BulkActionBar.propTypes = {
  selectedCount: PropTypes.number.isRequired,
  permissions: PropTypes.shape({
    canSendEmails: PropTypes.bool,
    canManageParticipants: PropTypes.bool,
  }),
  writable: PropTypes.bool,
  readOnlyTitle: PropTypes.string,
  onEmail: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};

export default BulkActionBar;
