import { FiCalendar, FiClock, FiMap, FiPhone, FiUser, FiMail, FiTag, FiFileText, FiLock, FiChevronDown, FiInfo } from "react-icons/fi";
import { LuWallet, LuReceipt, LuPiggyBank } from 'react-icons/lu';
import SafeEmailLink from '../SafeEmailLink';
import { useTranslation } from 'react-i18next';
import { Card, Text, Badge, Modal } from '../UI';
import PropTypes from 'prop-types';
import { formatEventDateDisplay, formatEventTime } from '../../Utils/formatDate';
import { getBudgetHealth } from '../../Utils/budgetHealth';
import { getSafeCurrency } from '../../Utils/currencyOptions';
import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// Currency formatter (pt-PT, sem casas decimais). A moeda é a do evento —
// o budget é single-currency (event.currency); getSafeCurrency protege contra
// códigos legados/inválidos que fariam o Intl rebentar.
const formatCurrency = (value, currency) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency', currency: getSafeCurrency(currency), minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
};

// Compact detail row: stacked label/value
const DetailRow = ({ icon: Icon, title, value, iconColor, isEmail = false }) => (
  <div className="flex items-start gap-2.5 py-1.5">
    <div className="mt-0.5 flex-shrink-0">
      <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden="true" />
    </div>
    <div className="min-w-0">
      <Text
        variant="caption"
        className="text-muted-foreground font-medium leading-none mb-0.5"
        as="span"
      >
        {title}
      </Text>
      <div>
        {isEmail ? (
          <SafeEmailLink
            email={value}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:underline transition-colors duration-150 font-medium"
          />
        ) : (
          <Text
            variant="body2"
            className="text-foreground font-medium break-words"
            as="span"
          >
            {value}
          </Text>
        )}
      </div>
    </div>
  </div>
);

// Tinted group sub-card. `action` opcional aparece à direita do título.
const DetailGroup = ({ title, colorClasses, action = null, children }) => (
  <div className={`rounded-lg ${colorClasses.bg} border ${colorClasses.border} px-5 py-4 space-y-1`}>
    <div className="flex items-center gap-1.5 mb-1">
      <Text variant="overline" className={`${colorClasses.text} font-semibold`}>
        {title}
      </Text>
      {action}
    </div>
    {children}
  </div>
);

// 4 cores de IDENTIDADE por secção (uma cor por secção). Ver designGuide.md.
// As cores semânticas (success/warning/error) ficam reservadas ao ESTADO real
// (barra de saúde do orçamento), não à identidade das secções.
// Título em -700 e ícone em -600 (light) para passar contraste WCAG AA sobre o
// tint -50; em dark os tons -300/-400 já contrastam com o fundo -900.
const GROUP_COLORS = {
  whenWhere: {
    bg: 'bg-orange-50/60 dark:bg-orange-900/10',
    border: 'border-orange-100 dark:border-orange-800/30',
    text: 'text-orange-700 dark:text-orange-300',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  organizer: {
    bg: 'bg-violet-50/60 dark:bg-violet-900/10',
    border: 'border-violet-100 dark:border-violet-800/30',
    text: 'text-violet-700 dark:text-violet-300',
    icon: 'text-violet-600 dark:text-violet-400',
  },
  eventProfile: {
    bg: 'bg-pink-50/60 dark:bg-pink-900/10',
    border: 'border-pink-100 dark:border-pink-800/30',
    text: 'text-pink-700 dark:text-pink-300',
    icon: 'text-pink-600 dark:text-pink-400',
  },
  financial: {
    bg: 'bg-blue-50/60 dark:bg-blue-900/10',
    border: 'border-blue-100 dark:border-blue-800/30',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'text-blue-600 dark:text-blue-400',
  },
};

// Saúde do orçamento → cor semântica do ESTADO (barra + badge + dot da legenda).
// Origem única para os 3 estados; consumida pela barra e pela legenda do modal.
const HEALTH_STATES = {
  healthy: { bar: 'bg-success-500 dark:bg-success-400', badge: 'success', dot: 'bg-success-500' },
  caution: { bar: 'bg-warning-600 dark:bg-warning-500', badge: 'warning', dot: 'bg-warning-500' },
  critical: { bar: 'bg-error-500 dark:bg-error-400', badge: 'error', dot: 'bg-error-500' },
};
const HEALTH_ORDER = ['healthy', 'caution', 'critical'];

// Ícone (i) + modal a explicar de onde vêm os valores financeiros (só fornecedores).
const FinancialInfo = () => {
  const { t } = useTranslation('event');
  const [open, setOpen] = useState(false);

  const defs = [
    { dot: 'bg-neutral-400', label: t('financial.info.budget'), desc: t('financial.info.budgetDesc') },
    { dot: 'bg-warning-500', label: t('financial.committed'), desc: t('financial.info.committedDesc') },
    { dot: 'bg-success-500', label: t('financial.effective'), desc: t('financial.info.effectiveDesc') },
    { dot: 'bg-info-500', label: t('financial.available'), desc: t('financial.info.availableDesc') },
  ];
  const thresholds = HEALTH_ORDER.map((k) => ({
    dot: HEALTH_STATES[k].dot,
    label: t(`financial.info.thresholds.${k}`),
  }));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('financial.info.trigger')}
        className="flex-shrink-0 p-0.5 rounded-full text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
      >
        <FiInfo className="w-4 h-4" aria-hidden="true" />
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} size="md" centered ariaLabelledby="fin-info-title">
        <Modal.Header>
          <span id="fin-info-title">{t('financial.info.title')}</span>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <Text variant="body2" className="text-muted-foreground">
            {t('financial.info.intro')}
          </Text>

          <div className="divide-y divide-border">
            {defs.map(({ dot, label, desc }) => (
              <div key={label} className="flex items-start gap-3 py-2.5">
                <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} aria-hidden="true" />
                <div>
                  <Text variant="body2" className="text-foreground font-semibold">{label}</Text>
                  <Text variant="caption" className="text-muted-foreground">{desc}</Text>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 text-center">
            <Text variant="body2" className="text-foreground font-medium">{t('financial.info.formula')}</Text>
            <Text variant="caption" className="text-muted-foreground">{t('financial.info.percentFormula')}</Text>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 border-t border-border">
            {thresholds.map(({ dot, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} aria-hidden="true" />
                <Text variant="caption" className="text-muted-foreground">{label}</Text>
              </span>
            ))}
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

// Secção financeira compacta embebida no card (gated pelo caller via canViewFinancial).
const FinancialSection = ({ budget, effectiveExpenses, committedExpenses, currency }) => {
  const { t } = useTranslation('event');
  const prefersReducedMotion = useReducedMotion();
  const { budgetAvailable, usedTotal, usedPercent, health, hasBudget } =
    getBudgetHealth({ budget, effectiveExpenses, committedExpenses });
  const clamped = Math.min(Math.max(usedPercent, 0), 100);
  const healthLabel = {
    healthy: t('financial.health.healthy', 'Saudável'),
    caution: t('financial.health.caution', 'Atenção'),
    critical: t('financial.health.critical', 'Crítico'),
  };

  const rows = [
    { icon: LuWallet, dot: 'bg-warning-500', label: t('financial.committed', 'Comprometidas'), value: formatCurrency(committedExpenses, currency) },
    { icon: LuReceipt, dot: 'bg-success-500', label: t('financial.effective', 'Despesas efetivas'), value: formatCurrency(effectiveExpenses, currency) },
    { icon: LuPiggyBank, dot: 'bg-info-500', label: t('financial.available', 'Disponível'), value: hasBudget ? formatCurrency(budgetAvailable, currency) : '—' },
  ];

  return (
    <>
      {hasBudget ? (
        <div className="mb-1">
          <div className="flex items-center justify-between mb-1.5">
            <Text variant="caption" className="text-muted-foreground font-medium">
              {formatCurrency(usedTotal, currency)} / {formatCurrency(budget, currency)}
            </Text>
            <Badge variant={HEALTH_STATES[health].badge} tone="soft" size="sm">
              {healthLabel[health]}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(clamped)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('financial.budgetTotal', 'Orçamento total')}
            >
              {/* Anima transform:scaleX (não width) — o width força layout/repaint
                  por frame; scaleX é compositor-only. origin-left escala da esquerda. */}
              {prefersReducedMotion ? (
                <div
                  className={`h-full w-full rounded-full origin-left ${HEALTH_STATES[health].bar}`}
                  style={{ transform: `scaleX(${clamped / 100})` }}
                />
              ) : (
                <motion.div
                  className={`h-full w-full rounded-full origin-left ${HEALTH_STATES[health].bar}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: clamped / 100 }}
                  transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.15 }}
                />
              )}
            </div>
            <Text variant="caption" className="text-muted-foreground font-medium tabular-nums w-9 text-right">
              {Math.round(clamped)}%
            </Text>
          </div>
        </div>
      ) : (
        <Text variant="caption" className="text-muted-foreground italic block py-1">
          {t('financial.noBudget', 'Nenhum orçamento definido')}
        </Text>
      )}

      <div className="space-y-1 pt-1">
        {rows.map(({ icon: Icon, dot, label, value }) => (
          <div key={label} className="flex items-center gap-2 py-0.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} aria-hidden="true" />
            <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            <Text variant="caption" className="text-muted-foreground flex-1">{label}</Text>
            <Text variant="body2" className="text-foreground font-semibold tabular-nums">{value}</Text>
          </div>
        ))}
      </div>
    </>
  );
};

FinancialSection.propTypes = {
  budget: PropTypes.number,
  effectiveExpenses: PropTypes.number,
  committedExpenses: PropTypes.number,
  currency: PropTypes.string,
};

const EventDetailsCard = ({
  event,
  totalDependents,
  participantCount,
  budget,
  effectiveExpenses,
  committedExpenses,
  canViewFinancial = false,
}) => {
  const { t } = useTranslation('event');
  const [isOpen, setIsOpen] = useState(() => window.innerWidth >= 640);

  const toggleOpen = () => setIsOpen(!isOpen);

  if (!event) return null;

  const {
    eventLocation,
    eventManager,
    eventManagerEmail,
    eventManagerPhone,
    categories,
    description,
    eventType,
    eventTime,
  } = event;

  const dateDisplay = formatEventDateDisplay(event);
  const timeDisplay = formatEventTime(eventTime);

  return (
    <Card
      className="w-full overflow-hidden animate-fade-in"
      elevated
      padded="none"
    >
      <button
        onClick={toggleOpen}
        className="flex items-center justify-between w-full px-5 py-4 border-b border-border hover:bg-accent transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-background-800"
        aria-expanded={isOpen}
        aria-controls="event-details-content"
      >
        <Text
          variant="h5"
          className="font-medium text-foreground tracking-tight"
        >
          {t('eventDetails.title')}
        </Text>
        <FiChevronDown
          className={`text-xl text-neutral-500 dark:text-neutral-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: 'auto', overflow: 'hidden' },
              collapsed: { opacity: 0, height: 0, overflow: 'hidden' }
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            id="event-details-content"
          >
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left column */}
                <div className="space-y-4">
                  {/* When & Where */}
                  <DetailGroup
                    title={t('eventDetails.groups.whenWhere')}
                    colorClasses={GROUP_COLORS.whenWhere}
                  >
                    <DetailRow
                      icon={FiCalendar}
                      title={t('eventForm.fields.dateTime.title')}
                      value={dateDisplay || t('eventDetails.fields.dateTime.missing')}
                      iconColor={GROUP_COLORS.whenWhere.icon}
                    />
                    {timeDisplay && (
                      <DetailRow
                        icon={FiClock}
                        title={t('eventForm.fields.eventTime.title')}
                        value={timeDisplay}
                        iconColor={GROUP_COLORS.whenWhere.icon}
                      />
                    )}
                    <DetailRow
                      icon={FiMap}
                      title={t('eventForm.fields.location.title')}
                      value={eventLocation || t('eventDetails.fields.location.missing')}
                      iconColor={GROUP_COLORS.whenWhere.icon}
                    />
                  </DetailGroup>

                  {/* Organizer */}
                  <DetailGroup
                    title={t('eventDetails.groups.organizer')}
                    colorClasses={GROUP_COLORS.organizer}
                  >
                    <DetailRow
                      icon={FiUser}
                      title={t('eventForm.fields.manager.title')}
                      value={eventManager || t('eventDetails.fields.manager.missing')}
                      iconColor={GROUP_COLORS.organizer.icon}
                    />
                    <DetailRow
                      icon={FiMail}
                      title={t('eventForm.fields.email.title')}
                      value={eventManagerEmail || t('eventDetails.fields.email.missing')}
                      iconColor={GROUP_COLORS.organizer.icon}
                      isEmail={!!eventManagerEmail}
                    />
                    <DetailRow
                      icon={FiPhone}
                      title={t('eventForm.fields.phone.title')}
                      value={eventManagerPhone || t('eventDetails.fields.phone.missing')}
                      iconColor={GROUP_COLORS.organizer.icon}
                    />
                  </DetailGroup>
                </div>

                {/* Right column — Event Profile + Financial */}
                <div className="space-y-4">
                <DetailGroup
                  title={t('eventDetails.groups.eventProfile')}
                  colorClasses={GROUP_COLORS.eventProfile}
                >
                  {/* Stat blocks: participants + dependents */}
                  <div className="grid grid-cols-2 gap-3 mb-1" role="group" aria-label={t('eventDetails.fields.participants.title')}>
                    <div className="text-center px-3 py-2 rounded-md bg-card border border-pink-100 dark:border-pink-800/30">
                      <Text variant="h5" className="font-semibold text-pink-700 dark:text-pink-300 tabular-nums">
                        {participantCount ?? '—'}
                      </Text>
                      <Text variant="caption" className="text-muted-foreground mt-0.5">
                        {t('eventDetails.fields.participants.title')}
                      </Text>
                    </div>
                    <div className="text-center px-3 py-2 rounded-md bg-card border border-pink-100 dark:border-pink-800/30">
                      <Text variant="h5" className="font-semibold text-pink-700 dark:text-pink-300 tabular-nums">
                        {totalDependents ?? '—'}
                      </Text>
                      <Text variant="caption" className="text-muted-foreground mt-0.5">
                        {t('eventDetails.fields.dependents.title')}
                      </Text>
                    </div>
                  </div>

                  {/* Categories as badges */}
                  {categories && categories.length > 0 && (
                    <div className="flex items-start gap-2.5 py-1.5">
                      <div className="mt-0.5 flex-shrink-0">
                        <FiTag className={`w-4 h-4 ${GROUP_COLORS.eventProfile.icon}`} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <Text variant="caption" className="text-muted-foreground font-medium leading-none mb-1.5" as="span">
                          {t('eventForm.fields.categories.title')}
                        </Text>
                        <div className="flex flex-wrap gap-1.5">
                          {categories.map((cat) => (
                            <Badge key={cat} variant="pink" tone="soft" size="sm">
                              {t(`eventForm.categories.${cat.toLowerCase()}`, cat)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Access type as badge */}
                  <div className="flex items-start gap-2.5 py-1.5">
                    <div className="mt-0.5 flex-shrink-0">
                      <FiLock className={`w-4 h-4 ${GROUP_COLORS.eventProfile.icon}`} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <Text variant="caption" className="text-muted-foreground font-medium leading-none mb-1.5" as="span">
                        {t('eventForm.fields.access.title')}
                      </Text>
                      <div>
                        <Badge
                          variant={eventType === 'private' ? 'warning' : 'info'}
                          tone="soft"
                          size="sm"
                        >
                          {t(`eventForm.accessTypes.${eventType}`)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </DetailGroup>

                {/* Financial section — gated: só renderiza com FINANCIAL_VIEW.
                    O backend já redacta budget/expenses para quem não pode ver. */}
                {canViewFinancial && (
                  <DetailGroup
                    title={t('financial.title', 'Resumo Financeiro')}
                    colorClasses={GROUP_COLORS.financial}
                    action={<FinancialInfo />}
                  >
                    <FinancialSection
                      budget={budget}
                      effectiveExpenses={effectiveExpenses}
                      committedExpenses={committedExpenses}
                      currency={event?.currency}
                    />
                  </DetailGroup>
                )}
                </div>
              </div>

              {/* Description well */}
              <div className="rounded-lg bg-background-50 dark:bg-background-800/30 border border-border p-4">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex-shrink-0">
                    <FiFileText className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <Text variant="caption" className="text-muted-foreground font-medium leading-none mb-1" as="span">
                      {t('eventForm.fields.description.title')}
                    </Text>
                    <Text variant="body2" className="text-foreground leading-relaxed whitespace-pre-line break-words">
                      {description || t('eventForm.defaults.noDescription')}
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

DetailRow.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.string,
  iconColor: PropTypes.string,
  isEmail: PropTypes.bool,
};

DetailGroup.propTypes = {
  title: PropTypes.string.isRequired,
  colorClasses: PropTypes.object.isRequired,
  action: PropTypes.node,
  children: PropTypes.node.isRequired,
};

EventDetailsCard.propTypes = {
  event: PropTypes.object.isRequired,
  totalDependents: PropTypes.number,
  participantCount: PropTypes.number,
  budget: PropTypes.number,
  effectiveExpenses: PropTypes.number,
  committedExpenses: PropTypes.number,
  canViewFinancial: PropTypes.bool,
};

export default EventDetailsCard;
