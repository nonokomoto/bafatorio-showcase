import { lazy, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    FiCalendar, FiClock, FiMapPin, FiUser, FiMail,
    FiPhone, FiList, FiAlignLeft, FiActivity,
    FiAlertCircle, FiSave, FiDollarSign
} from 'react-icons/fi';
import { useCreateEventMutation, useUpdateEventMutation } from '../../Api/services/eventApi';
import { billingGateReason, BILLING_GATE_KNOWN_REASONS } from '../../Hook/useAuthz';
import { EVENT_STATUS, EVENT_STATUS_KEYS } from '../../Utils/eventStatusConfig';
import { Card, Text, Input, Button } from '../UI';
import FormField from '../UI/FormField';
import EventDatePicker from './EventDatePicker';
import { getCurrencyOptions, DEFAULT_CURRENCY, getSafeCurrency } from '../../Utils/currencyOptions';
import {
    datePickerValueToEventFields,
    initialDatePickerValue,
    initialEventTimeInput,
    toIsoTime,
} from '../../Utils/eventDateConversion';
import PropTypes from 'prop-types';
import 'animate.css';

const Spinner = lazy(() => import('../UI/spinner'));

// Copy i18n específica do create de evento, por código de razão do servidor.
// A classificação "é parede de billing?" (→ mostra CTA) NÃO se declara aqui:
// deriva de BILLING_GATE_KNOWN_REASONS (fonte única em useAuthz), senão uma
// razão de billing nova perderia o CTA no momento de maior intenção de upgrade.
// billingGateReason tira o prefixo BILLING_GATE: das recusas por evento; o gate
// de conta devolve o reason nu.
const FEEDBACK_KEYS = {
    STARTER_LIMIT_REACHED: 'eventForm.gate.starterLimitReached',
    PRO_PAUSED: 'eventForm.gate.proPaused',
    PRO_LAPSED: 'eventForm.gate.proLapsed',
    WINDOW_EXPIRED: 'eventForm.gate.windowExpired',
    INVALID_EVENT_TITLE: 'eventForm.errors.invalidTitle',
    FORBIDDEN: 'eventForm.errors.forbidden',
    UNAUTHENTICATED: 'eventForm.errors.sessionExpired',
};
const feedbackFor = (code) => ({
    key: FEEDBACK_KEYS[code] ?? 'eventForm.gate.generic',
    gate: BILLING_GATE_KNOWN_REASONS.has(code),
});

// Constrói só o DTO enviado à Lambda — sem side-effects, testável isolado.
const buildEventInput = (data) => ({
    eventTitle: data.eventTitle.trim(),
    eventManager: data.eventManager.trim(),
    eventManagerEmail: data.eventManagerEmail.trim(),
    eventManagerPhone: data.eventManagerPhone.trim(),
    eventLocation: data.eventLocation.trim(),
    ...datePickerValueToEventFields(data.datePickerValue),
    eventTime: toIsoTime(data.eventTime || ''),
    eventType: data.eventType,
    // Vazio → null; o display faz o fallback para o placeholder (EventDetailsCard),
    // por isso não guardamos a string de UI como se fosse dado real.
    description: data.description?.trim() || null,
    categories: [data.categories],
    eventStatus: data.eventStatus,
    budget: parseFloat(data.budget) || 0,
    currency: getSafeCurrency(data.currency),
});

const EventForm = ({ onClose, id = null, existingEvent = null }) => {
    const navigate = useNavigate();
    const [feedback, setFeedback] = useState(null);
    const [isClosing, setIsClosing] = useState(false);
    const [createEvent, { isLoading: isCreating }] = useCreateEventMutation();
    const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();
    const { register, handleSubmit, formState: { errors }, reset, control } = useForm({
        defaultValues: { currency: DEFAULT_CURRENCY },
    });
    const { t } = useTranslation('event');
    const currencyOptions = getCurrencyOptions();

    useEffect(() => {
        if (existingEvent) {
            reset({
                eventTitle: existingEvent.eventTitle,
                eventManager: existingEvent.eventManager,
                eventManagerEmail: existingEvent.eventManagerEmail,
                eventManagerPhone: existingEvent.eventManagerPhone,
                eventLocation: existingEvent.eventLocation,
                datePickerValue: initialDatePickerValue(existingEvent),
                eventTime: initialEventTimeInput(existingEvent),
                eventType: existingEvent.eventType,
                description: existingEvent.description,
                categories: existingEvent.categories?.[0],
                eventStatus: existingEvent.eventStatus,
                budget: existingEvent.budget,
                currency: getSafeCurrency(existingEvent.currency),
            });
        }
    }, [existingEvent, reset]);

    const onSubmit = async (data) => {
        setFeedback(null);
        // organizerId, eventCreationDate e participantCount são decididos pela
        // Lambda — o cliente já não os envia. Estado inicial fixo no create.
        const eventInput = id
            ? buildEventInput(data)
            : { ...buildEventInput(data), eventStatus: 'SCHEDULED' };

        try {
            const result = id
                ? await updateEvent({ id, ...eventInput }).unwrap()
                : await createEvent(eventInput).unwrap();

            // Canal A — falha de negócio (200 com success:false): gate de conta,
            // janela fechada, FORBIDDEN, título inválido, etc.
            if (!result?.success) {
                const code = billingGateReason(result?.message) || result?.message || 'UNKNOWN';
                setFeedback(feedbackFor(code));
                return;
            }

            // O pai refetcha antes de fechar; sem isto o spinner morria aqui e o
            // form ficava parado no ecrã durante o round-trip.
            if (id) {
                setIsClosing(true);
                await onClose(true);
            }
            else navigate('/app/events');
        } catch (error) {
            // Canal B — transporte/servidor (timeout, 5xx, Lambda rebentou).
            // Nunca silencioso: sem isto o utilizador não sabe que falhou.
            console.error(t('eventForm.errors.submitFailed'), error);
            setFeedback(feedbackFor(null)); // sem código do servidor → genérico, sem CTA
        }
    };

    const eventTypes = [
        { value: 'public', label: t('eventForm.accessTypes.public') },
        { value: 'private', label: t('eventForm.accessTypes.private') }
    ];

    const eventStatuses = EVENT_STATUS_KEYS.map(key => ({
        value: key,
        label: t(EVENT_STATUS[key].labelKey),
    }));

    const categoryOptions = [
        { value: 'PERSONAL', label: t('eventForm.categories.personal') },
        { value: 'CORPORATE', label: t('eventForm.categories.corporate') }
    ];

    const handleBackToggle = () => {
        if (id) {
            onClose(false);
        } else {
            navigate(-1);
        }
    };

    return (
        <div className="container mx-auto px-4 py-6 max-w-4xl">
            {(isCreating || isUpdating || isClosing) ? (
                <Spinner 
                    status="loadingWithMessage" 
                    loadingMessage={id ? t('eventForm.loading.update') : t('eventForm.loading.create')} 
                />
            ) : (
                <Card 
                    className="overflow-hidden rounded-lg transition-all duration-300 border-t-4 border-t-primary-500/80 dark:border-t-primary-400/80" 
                    padded="none"
                    elevated="sm"
                >
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-border">
                        <Input
                            fullWidth
                            variant="unstyled"
                            size="lg"
                            className="text-3xl font-display font-medium placeholder:text-neutral-400/80 dark:placeholder:text-neutral-500/70 focus:placeholder:opacity-50 transition-opacity"
                            placeholder={t('eventForm.fields.eventTitle.placeholder')}
                            {...register("eventTitle", { 
                                required: t('eventForm.fields.eventTitle.required'),
                                minLength: {
                                    value: 3, message: t('eventForm.fields.eventTitle.minLength')
                                }
                            })}
                        />
                    </div>

                    {/* Form body */}
                    <div className="p-8">
                        <form onSubmit={handleSubmit(onSubmit)}>
                            {feedback && (
                                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-warning-300 dark:border-warning-700 bg-warning-50 dark:bg-warning-900/30 px-4 py-3">
                                    <div className="flex items-center gap-2 text-warning-800 dark:text-warning-100">
                                        <FiAlertCircle className="shrink-0" />
                                        <Text variant="body2">
                                            {t(feedback.key)}
                                        </Text>
                                    </div>
                                    {feedback.gate && (
                                        <Button size="sm" onClick={() => navigate('/app/plan-selection')}>
                                            {t('eventForm.gate.upgradeCta')}
                                        </Button>
                                    )}
                                </div>
                            )}
                            <div className="mb-8 group">
                                <div className="flex items-center gap-2 mb-2 text-muted-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
                                    <FiCalendar className="w-4 h-4 text-primary-500/70 dark:text-primary-400/70" aria-hidden="true" />
                                    <Text variant="subtitle2" className="font-medium">
                                        {t('eventForm.fields.dateTime.title')}
                                    </Text>
                                    <span className="text-primary-500/70 dark:text-primary-400/70 text-xs ml-0.5 transition-colors duration-200">*</span>
                                </div>
                                <Controller
                                    control={control}
                                    name="datePickerValue"
                                    rules={{
                                        validate: (v) =>
                                            (v?.type === 'range' && v.from) ||
                                            (v?.type === 'specific' && v.dates?.length > 0) ||
                                            t('eventForm.fields.dateTime.required'),
                                    }}
                                    render={({ field }) => (
                                        <EventDatePicker
                                            value={field.value}
                                            onChange={field.onChange}
                                            hasError={!!errors.datePickerValue}
                                        />
                                    )}
                                />
                                {errors.datePickerValue && (
                                    <Text variant="caption" className="text-destructive flex items-center gap-1.5 mt-1.5">
                                        <FiAlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                        {errors.datePickerValue.message}
                                    </Text>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                <div>
                                    <FormField
                                        icon={<FiClock className="text-blue-500" />}
                                        name="eventTime"
                                        type="time"
                                        label={t('eventForm.fields.eventTime.title')}
                                        register={register}
                                        errors={errors}
                                        t={t}
                                    />
                                    <p className="text-xs text-muted-foreground -mt-6">
                                        {t('eventForm.fields.eventTime.hint')}
                                    </p>
                                </div>

                                <FormField
                                    icon={<FiMapPin className="text-rose-500" />}
                                    name="eventLocation"
                                    label={t('eventForm.fields.location.title')}
                                    register={register}
                                    required={t('eventForm.fields.location.required')}
                                    errors={errors}
                                    t={t}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                <FormField
                                    icon={<FiUser className="text-violet-500" />}
                                    name="eventManager"
                                    label={t('eventForm.fields.manager.title')}
                                    register={register}
                                    required={t('eventForm.fields.manager.required')}
                                    errors={errors}
                                    t={t}
                                />

                                <FormField
                                    icon={<FiMail className="text-sky-500" />}
                                    name="eventManagerEmail"
                                    type="email"
                                    label={t('eventForm.fields.email.title')}
                                    register={register}
                                    required={t('eventForm.fields.email.required')}
                                    errors={errors}
                                    t={t}
                                    validation={{
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: t('eventForm.fields.email.pattern')
                                        }
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                <FormField
                                    icon={<FiPhone className="text-green-500" />}
                                    name="eventManagerPhone"
                                    label={t('eventForm.fields.phone.title')}
                                    register={register}
                                    required={t('eventForm.fields.phone.required')}
                                    errors={errors}
                                    t={t}
                                />

                                <div className="grid grid-cols-[1fr_auto] gap-3">
                                    <FormField
                                        icon={<FiDollarSign className="text-emerald-500" />}
                                        name="budget"
                                        type="number"
                                        label={t('eventForm.fields.budget.title')}
                                        register={register}
                                        required={t('eventForm.fields.budget.required')}
                                        errors={errors}
                                        t={t}
                                        validation={{
                                            min: {
                                                value: 0,
                                                message: t('eventForm.fields.budget.min')
                                            },
                                            validate: value =>
                                                !isNaN(parseFloat(value)) ||
                                                t('eventForm.fields.budget.validate')
                                        }}
                                    />
                                    <FormField
                                        name="currency"
                                        label={t('eventForm.fields.currency.title', 'Currency')}
                                        errors={errors}
                                        t={t}
                                        options={currencyOptions}
                                        isSelectField={true}
                                        control={control}
                                        placeholder={t('eventForm.fields.currency.placeholder', 'Select currency')}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                <FormField
                                    icon={<FiList className="text-indigo-500" />}
                                    name="eventType"
                                    label={t('eventForm.fields.access.title')}
                                    required={t('eventForm.fields.access.required')}
                                    errors={errors}
                                    t={t}
                                    options={eventTypes}
                                    isSelectField={true}
                                    control={control}
                                />

                                <FormField
                                    icon={<FiList className="text-purple-500" />}
                                    name="categories"
                                    label={t('eventForm.fields.eventType.title')}
                                    required={t('eventForm.fields.eventType.required')}
                                    errors={errors}
                                    t={t}
                                    options={categoryOptions}
                                    isSelectField={true}
                                    control={control}
                                />
                            </div>

                            {id && (
                                <div className="mt-6">
                                    <FormField
                                        icon={<FiActivity className="text-orange-500" />}
                                        name="eventStatus"
                                        label={t('eventForm.fields.eventStatus.title')}
                                        required={t('eventForm.fields.eventStatus.required')}
                                        errors={errors}
                                        t={t}
                                        options={eventStatuses}
                                        isSelectField={true}
                                        control={control}
                                    />
                                </div>
                            )}

                            <div className="mt-6">
                                <FormField
                                    icon={<FiAlignLeft className="text-amber-500" />}
                                    name="description"
                                    label={t('eventForm.fields.description.title')}
                                    register={register}
                                    errors={errors}
                                    isTextarea={true}
                                    t={t}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-12 flex justify-end gap-4">
                                <Button
                                    variant="outline"
                                    onClick={handleBackToggle}
                                    className="px-6"
                                >
                                    {t('eventForm.buttons.cancel')}
                                </Button>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    icon={<FiSave />}
                                    iconPosition="left"
                                    className="px-6 shadow-sm hover:shadow-md"
                                >
                                    {id ? t('eventForm.buttons.update') : t('eventForm.buttons.create')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </Card>
            )}
        </div>
    );
};

EventForm.propTypes = {
    onClose: PropTypes.func,
    id: PropTypes.string,
    existingEvent: PropTypes.object
};

export default EventForm;
