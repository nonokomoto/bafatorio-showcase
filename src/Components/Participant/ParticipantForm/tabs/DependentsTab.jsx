import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useFieldArray } from 'react-hook-form';
import { FiUsers, FiAlertCircle, FiX, FiPlus } from 'react-icons/fi';
import { inputCls, errorMsg, sectionTitle } from '../formStyles';

const DependentsTab = ({ register, errors, control }) => {
  const { t } = useTranslation('participant');
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'dependents',
  });

  return (
    <div className="space-y-6">
      {/* ── Section Header ── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 shrink-0">
            <FiUsers size={16} className="text-primary-500" />
          </span>
          <h4 className={sectionTitle}>
            {t('participantsV2.formModal.sections.dependents', 'Acompanhantes')}
          </h4>
        </div>

        {/* Info box */}
        <div className="flex gap-3 mb-5 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800 rounded-xl p-4">
          <FiAlertCircle
            size={16}
            className="text-info-700 dark:text-info-400 shrink-0 mt-0.5"
          />
          <span className="text-sm text-info-700 dark:text-info-400">
            {t(
              'participantsV2.formModal.dependents.info',
              'Adicione acompanhantes que estarão associados a este participante. Os dados dos acompanhantes serão incluídos nos relatórios e gestão do evento.'
            )}
          </span>
        </div>
      </div>

      {/* List of dependents */}
      <div className="space-y-1">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex gap-3 items-center py-2"
          >
            {/* Name input */}
            <div className="flex-1">
              <input
                type="text"
                placeholder={t(
                  'participantsV2.formModal.dependents.namePlaceholder',
                  'Nome do acompanhante'
                )}
                className={inputCls(errors.dependents?.[index]?.name)}
                {...register(`dependents.${index}.name`)}
              />
              {errors.dependents?.[index]?.name && (
                <span className={errorMsg}>
                  {errors.dependents[index].name.message}
                </span>
              )}
            </div>

            {/* Age group select */}
            <div className="w-[140px] shrink-0">
              <select
                className={inputCls(errors.dependents?.[index]?.age)}
                {...register(`dependents.${index}.age`)}
              >
                <option value="">
                  {t('participantsV2.formModal.dependents.ageGroupPlaceholder', 'Idade...')}
                </option>
                <option value="baby">
                  {t('participantsV2.formModal.dependents.ageBaby', 'Bebé')}
                </option>
                <option value="child">
                  {t('participantsV2.formModal.dependents.ageChild', 'Criança')}
                </option>
                <option value="adult">
                  {t('participantsV2.formModal.dependents.ageAdult', 'Adulto')}
                </option>
              </select>
              {errors.dependents?.[index]?.age && (
                <span className={errorMsg}>
                  {errors.dependents[index].age.message}
                </span>
              )}
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => remove(index)}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border-none cursor-pointer shrink-0 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
            >
              <FiX size={16} className="text-error-500" />
            </button>
          </div>
        ))}
      </div>

      {/* Add button */}
      <button
        type="button"
        onClick={() => append({ name: '', age: '' })}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-border bg-transparent text-primary-500 dark:text-primary-400 cursor-pointer text-sm font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
      >
        <FiPlus size={16} />
        {t('participantsV2.formModal.dependents.add', 'Adicionar acompanhante')}
      </button>
    </div>
  );
};

DependentsTab.propTypes = {
  register: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  control: PropTypes.object.isRequired,
  watch: PropTypes.func,
};

DependentsTab.defaultProps = {
  watch: null,
};

export default DependentsTab;
