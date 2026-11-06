import { memo, useEffect, useMemo } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiType, FiCalendar, FiClock, FiMapPin, FiTruck, FiUsers, FiAlignLeft } from 'react-icons/fi';
import { Modal, Button, Text, Select, FormField, FieldLabel } from '../UI';
import { useCreateScheduleEntryMutation, useUpdateScheduleEntryMutation } from '../../Api/services/scheduleApi';
import { useListSuppliersEnhancedQuery } from '../../Api/services/supplierApi';
import { useListEventSuppliersByEventEnhancedQuery } from '../../Api/services/eventSupplierApi';
import { useListParticipantsByEventLambdaQuery } from '../../Api/services/participantApi';
import { DEFAULT_SCHEDULE_COLOR } from '../../Utils/scheduleColors';
import ScheduleColorPicker from './ScheduleColorPicker';
import { useEventRole } from '../../Hook/useEventRole';
import { useAuthz, billingGateReasonFromError } from '../../Hook/useAuthz';
import BillingGateNotice from '../Common/BillingGateNotice';

// Create mode: prefill with defaultDate/defaultTime (from FAB or slot click).
// Edit mode: prefill from existing entry.
const buildDefaultValues = (entry, defaultDate, defaultTime) => {
  if (entry) {
    return {
      title: entry.title ?? '',
      date: entry.date ?? '',
      allDay: !entry.startTime,
      startTime: entry.startTime ?? '',
      endTime: entry.endTime ?? '',
      description: entry.description ?? '',
      location: entry.location ?? '',
      supplierId: entry.supplierId ?? '',
      participantIds: entry.participantIds ?? [],
      // Ausente significa default: entradas legadas abrem com o swatch default
      // seleccionado, sem estado "sem cor" que o utilizador teria de decifrar.
      color: entry.color ?? DEFAULT_SCHEDULE_COLOR,
    };
  }
  return {
    title: '',
    date: defaultDate ?? '',
    allDay: false,
    startTime: defaultTime ?? '',
    endTime: '',
    description: '',
    location: '',
    supplierId: '',
    participantIds: [],
    color: DEFAULT_SCHEDULE_COLOR,
  };
};

// Form → API. O simétrico do buildDefaultValues, que faz entry → form.
//
// Um payload só para o create e para o update: null significa REMOVE no update
// e "campo ausente" no create, que ignora os falsy
// (`...(color && { color })`, `...(participantIds?.length && ...)` nos
// handlers). Verificado em DynamoDB: uma entrada criada com todos estes nulls
// não grava um único atributo NULL.
const buildEntryPayload = (data, eventId) => ({
  eventId,
  title: data.title,
  date: data.date,
  description: data.description || null,
  location: data.location || null,
  supplierId: data.supplierId || null,
  participantIds: data.participantIds ?? [],
  // O default não é persistido: escolhê-lo é voltar ao estado das entradas
  // legadas, que não têm o campo.
  color: data.color === DEFAULT_SCHEDULE_COLOR ? null : data.color,
  // Limpa a hora ao passar a dia inteiro.
  startTime: data.allDay ? null : (data.startTime || null),
  endTime: data.allDay ? null : (data.endTime || null),
});

// Any date is accepted (ADR-029, Leitura A) — no min/max, no enumerated set.

const ScheduleEntryFormModal = memo(({ eventId, isOpen, onClose, entry, defaultDate, defaultTime }) => {
  const { t } = useTranslation('schedule');
  const isEditing = !!entry;

  // Defense-in-depth (ADR-029): the popover/calendar already gate the entry
  // points, but the modal re-checks before submit so an unauthorized state
  // (stale prop, race) cannot trigger a backend rejection.
  const { canCreateScheduleEntry, canEditScheduleEntry } = useEventRole(eventId);

  // Gate cosmético de billing (§4b): evento read-only desativa o submit e
  // explica porquê; a recusa real (BILLING_GATE:*) vem da Lambda e é mapeada
  // abaixo a partir do erro da mutation.
  const { writable, reason: accessReason } = useAuthz(eventId);

  const [createEntry, { isLoading: isCreating, error: createError, reset: resetCreate }] = useCreateScheduleEntryMutation();
  const [updateEntry, { isLoading: isUpdating, error: updateError, reset: resetUpdate }] = useUpdateScheduleEntryMutation();

  const isLoading = isCreating || isUpdating;
  const apiError = createError || updateError;

  // Mesma cache que a tab de Participantes do EventDetails — a agenda é uma tab
  // do mesmo ecrã, portanto na prática já vem quente.
  const { data: participantsData } = useListParticipantsByEventLambdaQuery(
    { eventId },
    { skip: !isOpen || !eventId }
  );

  const participantOptions = useMemo(
    () =>
      (participantsData?.items || []).map((p) => ({ value: p.id, label: p.participantName })),
    [participantsData]
  );

  const { data: suppliersData } = useListSuppliersEnhancedQuery(undefined, { skip: !isOpen });
  const { data: eventSuppliersData } = useListEventSuppliersByEventEnhancedQuery(
    { eventId },
    { skip: !isOpen || !eventId }
  );

  const linkedSupplierIds = useMemo(() => {
    const ids = new Set();
    (eventSuppliersData?.items || []).forEach((es) => ids.add(es.supplierId));
    return ids;
  }, [eventSuppliersData]);

  const supplierOptionGroups = useMemo(() => {
    const allGlobal = suppliersData?.items || [];
    const eventSuppliers = eventSuppliersData?.items || [];
    
    // Create a map of all unique suppliers we know about
    const allSuppliersMap = new Map();
    
    // 1. Add global suppliers
    allGlobal.forEach(s => allSuppliersMap.set(s.id, s));
    
    // 2. Add event suppliers (they contain nested supplier info)
    eventSuppliers.forEach(es => {
      if (es.supplier && !allSuppliersMap.has(es.supplier.id)) {
        allSuppliersMap.set(es.supplier.id, es.supplier);
      }
    });

    const all = Array.from(allSuppliersMap.values());
    const linked = all.filter((s) => linkedSupplierIds.has(s.id));
    const unlinked = all.filter((s) => !linkedSupplierIds.has(s.id));
    
    const groups = [];
    
    if (linked.length > 0) {
      groups.push({
        label: t('schedule:form.sections.suppliersInEvent', 'No Evento'),
        options: linked.map((s) => ({ value: s.id, label: s.name })),
      });
    }
    
    if (unlinked.length > 0) {
      groups.push({
        label: t('schedule:form.sections.suppliersOthers', 'Outros Fornecedores'),
        options: unlinked.map((s) => ({ value: s.id, label: s.name })),
      });
    }

    return groups;
  }, [suppliersData, eventSuppliersData, linkedSupplierIds, t]);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: buildDefaultValues(entry, defaultDate, defaultTime),
  });

  // useWatch isolates subscription to allDay only — watch() at root re-renders on every keystroke.
  const allDay = useWatch({ control, name: 'allDay' });

  // Resets form + mutation state when modal opens, reading current prop values at that moment.
  // entry/defaultDate/defaultTime intentionally excluded from deps — picked up on next open transition.
  useEffect(() => {
    if (isOpen) {
      reset(buildDefaultValues(entry, defaultDate, defaultTime));
      resetCreate();
      resetUpdate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const onSubmit = async (data) => {
    if (isEditing) {
      if (!canEditScheduleEntry(entry?.owner)) return;
    } else if (!canCreateScheduleEntry()) {
      return;
    }

    const payload = buildEntryPayload(data, eventId);
    const result = isEditing
      ? await updateEntry({ id: entry.id, ...payload })
      : await createEntry(payload);

    if (!result.error) onClose();
  };

  // Recusa do gate (da mutation) ou evento já sabido read-only: aviso com CTA
  // em vez da mensagem de erro crua.
  const gateReason = billingGateReasonFromError(apiError) ?? (!writable ? accessReason : null);
  const apiErrorMessage = gateReason
    ? null
    : apiError?.data?.message ?? apiError?.message ?? (apiError ? t('form.genericError') : null);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" centered fullWidth ariaLabelledby="schedule-entry-form-title">
      <Modal.Header>
        <Text id="schedule-entry-form-title" variant="h5" weight="semibold" as="span">
          {isEditing ? t('schedule:form.titleEdit') : t('schedule:form.title')}
        </Text>
      </Modal.Header>

      <Modal.Body>
        <form id="schedule-entry-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* O FormField traz o seu próprio mb-8; o grid só separa colunas. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <div className="md:col-span-2">
              <FormField
                icon={<FiType />}
                name="title"
                label={t('schedule:form.fields.title')}
                placeholder={t('schedule:form.placeholders.title')}
                register={register}
                errors={errors}
                required={t('schedule:form.validation.titleRequired')}
              />
            </div>

            <FormField
              icon={<FiCalendar />}
              name="date"
              type="date"
              label={t('schedule:form.fields.date')}
              placeholder=" "
              register={register}
              errors={errors}
              required={t('schedule:form.validation.dateRequired')}
            />

            <div className="flex items-center pt-8">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Controller
                  name="allDay"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-primary-600"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Text variant="body2">{t('schedule:form.fields.allDay')}</Text>
              </label>
            </div>

            {!allDay && (
              <>
                <FormField
                  icon={<FiClock />}
                  name="startTime"
                  type="time"
                  label={t('schedule:form.fields.startTime')}
                  placeholder=" "
                  register={register}
                  errors={errors}
                />
                <FormField
                  icon={<FiClock />}
                  name="endTime"
                  type="time"
                  label={t('schedule:form.fields.endTime')}
                  placeholder=" "
                  register={register}
                  errors={errors}
                />
              </>
            )}

            <FormField
              icon={<FiMapPin />}
              name="location"
              label={t('schedule:form.fields.location')}
              placeholder={t('schedule:form.placeholders.location')}
              register={register}
              errors={errors}
            />

            {/* Os dois selects não passam pelo FormField: precisam de
                optionGroups, multiple e search, que ele não expõe. O FieldLabel
                dá-lhes o mesmo cabeçalho. */}
            {supplierOptionGroups.length > 0 && (
              <div className="mb-8 group">
                <FieldLabel
                  icon={<FiTruck />}
                  label={t('schedule:form.fields.supplier')}
                  htmlFor="entry-supplier"
                  className="group-hover:text-primary-600 dark:group-hover:text-primary-400"
                />
                <Controller
                  name="supplierId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="entry-supplier"
                      name="supplierId"
                      fullWidth
                      placeholder={t('schedule:form.placeholders.supplier')}
                      optionGroups={supplierOptionGroups}
                      value={field.value}
                      onChange={field.onChange}
                      search
                      clearable
                      selectClassName="h-12"
                    />
                  )}
                />
              </div>
            )}

            {/* Independente do fornecedor: uma entrada pode ter os dois
                ("prova de bolo com o catering e a noiva") — ADR-029. */}
            {participantOptions.length > 0 && (
              <div className="mb-8 group">
                <FieldLabel
                  icon={<FiUsers />}
                  label={t('schedule:form.fields.participants')}
                  htmlFor="entry-participants"
                  className="group-hover:text-primary-600 dark:group-hover:text-primary-400"
                />
                <Controller
                  name="participantIds"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="entry-participants"
                      name="participantIds"
                      fullWidth
                      placeholder={t('schedule:form.placeholders.participants')}
                      options={participantOptions}
                      value={field.value}
                      onChange={field.onChange}
                      multiple
                      search
                      clearable
                      selectClassName="h-12"
                    />
                  )}
                />
              </div>
            )}

            <div className="md:col-span-2 mb-8">
              <Controller
                name="color"
                control={control}
                render={({ field }) => (
                  <ScheduleColorPicker
                    value={field.value}
                    onChange={field.onChange}
                    label={t('schedule:form.fields.color')}
                    t={t}
                  />
                )}
              />
            </div>

            <div className="md:col-span-2">
              <FormField
                icon={<FiAlignLeft />}
                name="description"
                label={t('schedule:form.fields.description')}
                placeholder={t('schedule:form.placeholders.description')}
                register={register}
                errors={errors}
                isTextarea
              />
            </div>
          </div>

          {gateReason && <BillingGateNotice reason={gateReason} />}
          {apiErrorMessage && (
            <Text variant="body2" className="text-error-600 dark:text-error-400">
              {apiErrorMessage}
            </Text>
          )}
        </form>
      </Modal.Body>

      <Modal.Footer>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" size="sm" disabled={isLoading} onClick={onClose}>
            {t('schedule:form.cancel')}
          </Button>
          <Button type="submit" form="schedule-entry-form" variant="primary" size="sm" disabled={isLoading || !writable} loading={isLoading}>
            {isEditing ? t('schedule:form.submitEdit') : t('schedule:form.submit')}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
});

ScheduleEntryFormModal.displayName = 'ScheduleEntryFormModal';

ScheduleEntryFormModal.propTypes = {
  eventId: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  entry: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    date: PropTypes.string,
    startTime: PropTypes.string,
    endTime: PropTypes.string,
    description: PropTypes.string,
    location: PropTypes.string,
    supplierId: PropTypes.string,
    participantIds: PropTypes.arrayOf(PropTypes.string),
    color: PropTypes.string,
    owner: PropTypes.string,
  }),
  defaultDate: PropTypes.string,
  defaultTime: PropTypes.string,
};

export default ScheduleEntryFormModal;
