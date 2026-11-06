import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiHome, FiDollarSign, FiCalendar } from 'react-icons/fi';
import { inputCls, labelCls, sectionTitle } from '../formStyles';

const AccommodationTab = ({ register }) => {
  const { t } = useTranslation('participant');

  return (
    <div className="space-y-6">
      {/* ── Stay Details Section ── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-secondary-100 dark:bg-secondary-900/30 shrink-0">
            <FiHome size={16} className="text-secondary-500" />
          </span>
          <h4 className={sectionTitle}>
            {t('participantsV2.formModal.sections.stayDetails', 'Detalhes da Estadia')}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
          {/* Hotel */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.hotelName', 'Hotel')}
            </label>
            <input type="text" className={inputCls(false)} {...register('hotelName')} />
          </div>

          {/* Tipo de Quarto */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.roomType', 'Tipo de Quarto')}
            </label>
            <input type="text" className={inputCls(false)} {...register('roomType')} />
          </div>
        </div>
      </div>

      {/* ── Dates Section ── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-info-100 dark:bg-info-900/30 shrink-0">
            <FiCalendar size={16} className="text-info-500" />
          </span>
          <h4 className={sectionTitle}>
            {t('participantsV2.formModal.sections.stayDates', 'Datas')}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
          {/* Check-in */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.checkInDate', 'Check-in')}
            </label>
            <input type="date" className={inputCls(false)} {...register('checkInDate')} />
          </div>

          {/* Check-out */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.checkOutDate', 'Check-out')}
            </label>
            <input type="date" className={inputCls(false)} {...register('checkOutDate')} />
          </div>

          {/* Noites */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.nights', 'Noites')}
            </label>
            <input type="number" className={inputCls(false)} {...register('nights')} />
          </div>
        </div>
      </div>

      {/* ── Costs Section ── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-warning-100 dark:bg-warning-900/30 shrink-0">
            <FiDollarSign size={16} className="text-warning-500" />
          </span>
          <h4 className={sectionTitle}>
            {t('participantsV2.formModal.sections.stayCosts', 'Custos')}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
          {/* Tarifa/Noite */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.ratePerNight', 'Tarifa/Noite')}
            </label>
            <div className="flex rounded-lg overflow-hidden border border-border focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
              <input
                type="number"
                placeholder="0.00"
                className="flex-1 text-sm px-3.5 py-2.5 bg-card text-foreground focus:outline-none border-none"
                {...register('ratePerNight')}
              />
              <input
                type="text"
                className="w-16 text-center text-xs font-medium bg-muted text-muted-foreground border-none border-l border-border focus:outline-none shrink-0"
                {...register('accommodationCurrency')}
              />
            </div>
          </div>

          {/* Custo Total Alojamento — full width */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.accommodationCost', 'Custo Total')}
            </label>
            <div className="flex rounded-lg overflow-hidden border border-border focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
              <input
                type="number"
                placeholder="0.00"
                className="flex-1 text-base font-semibold px-3.5 py-2.5 bg-card text-foreground focus:outline-none border-none"
                {...register('accommodationCost')}
              />
              <span className="flex items-center px-3.5 text-xs font-medium bg-muted text-muted-foreground border-l border-border shrink-0">
                {t('participantsV2.formModal.fields.totalLabel', 'total')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

AccommodationTab.propTypes = {
  register: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  control: PropTypes.object,
  watch: PropTypes.func,
};

AccommodationTab.defaultProps = {
  control: null,
  watch: null,
};

export default AccommodationTab;
