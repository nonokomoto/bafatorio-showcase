import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiNavigation, FiTruck, FiSend, FiDollarSign } from 'react-icons/fi';
import { inputCls, labelCls, sectionTitle } from '../formStyles';

const TravelTab = ({ register, watch }) => {
  const { t } = useTranslation('participant');
  const transferRequired = watch('transferRequired');

  return (
    <div className="space-y-6">
      {/* ── Arrival Section ── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-info-100 dark:bg-info-900/30 shrink-0">
            <FiNavigation size={20} className="text-info-500" />
          </span>
          <h4 className={sectionTitle}>
            {t('participantsV2.formModal.sections.arrival', 'Chegada')}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.arrivalDate', 'Data de Chegada')}
            </label>
            <input type="date" className={inputCls(false)} {...register('arrivalDate')} />
          </div>
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.arrivalTime', 'Hora')}
            </label>
            <input type="time" className={inputCls(false)} {...register('arrivalTime')} />
          </div>
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.arrivalFlight', 'Voo')}
            </label>
            <input type="text" className={inputCls(false)} {...register('arrivalFlight')} />
          </div>
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.arrivalAirport', 'Aeroporto')}
            </label>
            <input type="text" className={inputCls(false)} {...register('arrivalAirport')} />
          </div>
        </div>

        {/* Escalas - full width */}
        <div className="mt-5">
          <label className={labelCls}>
            {t('participantsV2.formModal.fields.arrivalLayovers', 'Escalas')}
          </label>
          <input type="text" className={inputCls(false)} {...register('arrivalLayovers')} />
        </div>
      </div>

      {/* ── Transfer Section ── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-secondary-100 dark:bg-secondary-900/30 shrink-0">
            <FiTruck size={20} className="text-secondary-500" />
          </span>
          <h4 className={sectionTitle}>
            {t('participantsV2.formModal.sections.transfer', 'Transfer')}
          </h4>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer mb-4">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-primary-500"
            {...register('transferRequired')}
          />
          <span className="text-sm text-foreground">
            {t('participantsV2.formModal.sections.transferRequired', 'Transfer necessário')}
          </span>
        </label>

        {transferRequired && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
            <div>
              <label className={labelCls}>
                {t('participantsV2.formModal.fields.transferDetails', 'Detalhes')}
              </label>
              <input type="text" className={inputCls(false)} {...register('transferDetails')} />
            </div>
            <div>
              <label className={labelCls}>
                {t('participantsV2.formModal.fields.transferCost', 'Custo')}
              </label>
              <div className="flex rounded-lg overflow-hidden border border-border focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
                <input
                  type="number"
                  placeholder="0.00"
                  className="flex-1 text-sm px-3.5 py-2.5 bg-card text-foreground focus:outline-none border-none"
                  {...register('transferCost')}
                />
                <input
                  type="text"
                  className="w-16 text-center text-xs font-medium bg-muted text-muted-foreground border-none border-l border-border focus:outline-none shrink-0"
                  {...register('transferCurrency')}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Departure Section ── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-warning-100 dark:bg-warning-900/30 shrink-0">
            <FiSend size={20} className="text-warning-500" />
          </span>
          <h4 className={sectionTitle}>
            {t('participantsV2.formModal.sections.departure', 'Partida')}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.departureDate', 'Data')}
            </label>
            <input type="date" className={inputCls(false)} {...register('departureDate')} />
          </div>
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.departureTime', 'Hora')}
            </label>
            <input type="time" className={inputCls(false)} {...register('departureTime')} />
          </div>
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.departureFlight', 'Voo')}
            </label>
            <input type="text" className={inputCls(false)} {...register('departureFlight')} />
          </div>
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.departureAirport', 'Aeroporto')}
            </label>
            <input type="text" className={inputCls(false)} {...register('departureAirport')} />
          </div>
        </div>
      </div>

      {/* ── Travel Costs Section ── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-warning-100 dark:bg-warning-900/30 shrink-0">
            <FiDollarSign size={20} className="text-warning-600 dark:text-warning-400" />
          </span>
          <h4 className={sectionTitle}>
            {t('participantsV2.formModal.sections.travelCosts', 'Custos de Viagem')}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
          {/* Tarifa do Bilhete */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.ticketFare', 'Tarifa do Bilhete')}
            </label>
            <div className="flex rounded-lg overflow-hidden border border-border focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
              <input
                type="number"
                placeholder="0.00"
                className="flex-1 text-sm px-3.5 py-2.5 bg-card text-foreground focus:outline-none border-none"
                {...register('ticketFare')}
              />
              <input
                type="text"
                className="w-16 text-center text-xs font-medium bg-muted text-muted-foreground border-none border-l border-border focus:outline-none shrink-0"
                {...register('ticketCurrency')}
              />
            </div>
          </div>

          {/* Taxas/Extras */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.taxesExtras', 'Taxas/Extras')}
            </label>
            <div className="flex rounded-lg overflow-hidden border border-border focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
              <input
                type="number"
                placeholder="0.00"
                className="flex-1 text-sm px-3.5 py-2.5 bg-card text-foreground focus:outline-none border-none"
                {...register('taxesExtras')}
              />
              <input
                type="text"
                className="w-16 text-center text-xs font-medium bg-muted text-muted-foreground border-none border-l border-border focus:outline-none shrink-0"
                {...register('taxesCurrency')}
              />
            </div>
          </div>

          {/* Custo Total Viagem — full width */}
          <div className="sm:col-span-2">
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.totalTravelCost', 'Custo Total Viagem')}
            </label>
            <div className="flex rounded-lg overflow-hidden border border-border focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
              <input
                type="number"
                placeholder="0.00"
                className="flex-1 text-base font-semibold px-3.5 py-2.5 bg-card text-foreground focus:outline-none border-none"
                {...register('totalTravelCost')}
              />
              <input
                type="text"
                className="w-16 text-center text-xs font-medium bg-muted text-muted-foreground border-none border-l border-border focus:outline-none shrink-0"
                {...register('travelCurrency')}
              />
            </div>
          </div>

          {/* Estado do Pagamento */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.paymentStatus', 'Estado do Pagamento')}
            </label>
            <select className={inputCls(false)} {...register('paymentStatus')}>
              <option value="">
                {t('participantsV2.formModal.fields.paymentStatusOptions.placeholder', 'Selecionar...')}
              </option>
              <option value="PENDING">
                {t('participantsV2.formModal.fields.paymentStatusOptions.pending', 'Pendente')}
              </option>
              <option value="PAID">
                {t('participantsV2.formModal.fields.paymentStatusOptions.paid', 'Pago')}
              </option>
              <option value="PARTIAL">
                {t('participantsV2.formModal.fields.paymentStatusOptions.partial', 'Parcial')}
              </option>
            </select>
          </div>

          {/* Referencia de Reserva */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.bookingReference', 'Referência de Reserva')}
            </label>
            <input type="text" className={inputCls(false)} {...register('bookingReference')} />
          </div>

          {/* Agencia de Reserva */}
          <div>
            <label className={labelCls}>
              {t('participantsV2.formModal.fields.bookingAgency', 'Agência de Reserva')}
            </label>
            <input type="text" className={inputCls(false)} {...register('bookingAgency')} />
          </div>
        </div>
      </div>
    </div>
  );
};

TravelTab.propTypes = {
  register: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  control: PropTypes.object,
  watch: PropTypes.func.isRequired,
};

TravelTab.defaultProps = {
  control: null,
};

export default TravelTab;
