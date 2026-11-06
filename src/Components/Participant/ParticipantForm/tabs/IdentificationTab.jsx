import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiCreditCard, FiFileText, FiPhone } from 'react-icons/fi';
import { inputCls, labelCls, sectionTitle } from '../formStyles';

const IdentificationTab = ({ register, errors, mode }) => {
  const { t } = useTranslation('participant');

  return (
    <div className="space-y-6">
      {/* ── Documents Section ── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-info-100 dark:bg-info-900/30 shrink-0">
            <FiCreditCard size={16} className="text-info-500" />
          </span>
          <h4 className={sectionTitle}>
            {t('participantsV2.formModal.sections.documents', 'Documentação')}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
          {/* Tipo de Documento */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.documentationType', 'Tipo de Documento')}
            </label>
            <input
              type="text"
              className={inputCls(errors.documentationType)}
              {...register('documentationType')}
            />
          </div>

          {/* Ultimos 4 digitos */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.documentLast4', 'Últimos 4 dígitos')}
            </label>
            <input
              type="text"
              maxLength={4}
              className={inputCls(errors.documentLast4)}
              {...register('documentLast4')}
            />
          </div>

          {/* Nacionalidade */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.nationality', 'Nacionalidade')}
            </label>
            <input
              type="text"
              className={inputCls(errors.nationality)}
              {...register('nationality')}
            />
          </div>

          {/* Pais de Residencia */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.residenceCountry', 'País de Residência')}
            </label>
            <input
              type="text"
              className={inputCls(errors.residenceCountry)}
              {...register('residenceCountry')}
            />
          </div>

          {/* ID Interno — only visible in edit mode */}
          {mode === 'edit' && (
            <div>
              <label className={labelCls}>
                {t('participantsV2.formModal.fields.internalId', 'ID Interno')}
              </label>
              <input
                type="text"
                className={`${inputCls(false)} bg-muted cursor-default`}
                readOnly
                {...register('internalId')}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Emergency Contact Section ── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-error-100 dark:bg-error-900/30 shrink-0">
            <FiPhone size={16} className="text-error-500" />
          </span>
          <h4 className={sectionTitle}>
            {t('participantsV2.formModal.sections.emergency', 'Emergência')}
          </h4>
        </div>

        <div>
          <label className={labelCls}>
            {t('participantsV2.formModal.fields.emergencyContact', 'Contacto de Emergência')}
          </label>
          <input
            type="text"
            className={inputCls(errors.emergencyContact)}
            {...register('emergencyContact')}
          />
        </div>
      </div>

      {/* ── Visa Section ── */}
      <div className="bg-muted border border-border rounded-xl p-4">
        {/* Section header */}
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-warning-100 dark:bg-warning-900/30 shrink-0">
            <FiFileText size={16} className="text-warning-500" />
          </span>
          <h4 className={sectionTitle}>
            {t('participantsV2.formModal.sections.visa', 'Visto')}
          </h4>
        </div>

        {/* Visa Required */}
        <label className="flex items-center gap-2.5 cursor-pointer mb-3">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-primary-500"
            {...register('visaRequired')}
          />
          <span className="text-sm text-foreground">
            {t('participantsV2.formModal.sections.visaRequired', 'Visto necessário')}
          </span>
        </label>

        {/* Visa Support */}
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-primary-500"
            {...register('visaSupport')}
          />
          <span className="text-sm text-foreground">
            {t('participantsV2.formModal.sections.visaSupport', 'Apoio com visto')}
          </span>
        </label>
      </div>
    </div>
  );
};

IdentificationTab.propTypes = {
  register: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  control: PropTypes.object,
  watch: PropTypes.func,
  mode: PropTypes.oneOf(['create', 'edit']),
};

IdentificationTab.defaultProps = {
  control: null,
  watch: null,
  mode: 'create',
};

export default IdentificationTab;
