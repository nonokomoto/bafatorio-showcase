import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { PLANS, PLAN_KEYS, getTierByKey, getDiscountedAmount } from 'src/Utils/plans';
import { Modal, Button } from '../UI';
import { formatEUR } from './CreatePlan/planConfig';

// Chaves i18n por plano — o plano desconhecido (marcador corrompido) degrada
// para o texto genérico: pago é pago, o ecrã aparece sempre.
const SUBTITLE_KEYS = {
  [PLAN_KEYS.PAY_PER_EVENT]: 'checkoutSuccess.subtitle.payPerEvent',
  [PLAN_KEYS.PRO]: 'checkoutSuccess.subtitle.pro',
};
const CTA_KEYS = {
  [PLAN_KEYS.PAY_PER_EVENT]: 'checkoutSuccess.cta.payPerEvent',
  [PLAN_KEYS.PRO]: 'checkoutSuccess.cta.pro',
};
const NAME_KEYS = {
  [PLAN_KEYS.PAY_PER_EVENT]: 'plans.grid.names.payPerEvent',
  [PLAN_KEYS.PRO]: 'plans.grid.names.pro',
};

/**
 * Recibo compacto derivado da fonte única de planos: escalão do Por Evento
 * pelo tierKey; Pro pelo ciclo com o cupão de lançamento aplicado — o valor
 * mostrado é o cobrado. Sem dados suficientes devolve null e o modal
 * mostra só a confirmação.
 */
const deriveReceipt = (planKey, tierKey, billingCycle, t) => {
  if (planKey === PLAN_KEYS.PAY_PER_EVENT && tierKey) {
    const tier = getTierByKey(tierKey);
    if (!tier) return null;
    return {
      name: t(NAME_KEYS[planKey]),
      detail: Number.isFinite(tier.maxParticipants)
        ? t('checkoutSuccess.tier.capped', { count: tier.maxParticipants })
        : t('checkoutSuccess.tier.uncapped'),
      amount: tier.amount,
    };
  }
  if (planKey === PLAN_KEYS.PRO && billingCycle) {
    const price = PLANS[PLAN_KEYS.PRO].prices[billingCycle];
    if (!price) return null;
    return {
      name: t(NAME_KEYS[planKey]),
      detail: t(`plans.billing.cycles.${billingCycle}`),
      amount: getDiscountedAmount(PLAN_KEYS.PRO, price.amount),
    };
  }
  return null;
};

const rise = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

/** Rebentamento único de confetti nas cores da marca, morre em ~1,6 s. */
const burstConfetti = (canvas) => {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const colors = ['#4069FF', '#6366F1', '#10B981', '#34d399', '#a5b4fc'];
  const cx = rect.width / 2;
  const parts = Array.from({ length: 42 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 42 + Math.random() * 0.4;
    const speed = 2.2 + Math.random() * 3.4;
    return {
      x: cx, y: 104,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.4,
      w: 5 + Math.random() * 4,
      h: 3 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[i % colors.length],
    };
  });

  let start = null;
  let frameId;
  const frame = (ts) => {
    if (!start) start = ts;
    const elapsed = ts - start;
    const life = Math.max(0, 1 - elapsed / 1600);
    ctx.clearRect(0, 0, rect.width, rect.height);
    if (life === 0) return;
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.vx *= 0.985;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(frameId);
};

/**
 * Confirmação pós-checkout, montada pelo Layout no regresso da Stripe.
 * Sequência: selo (disco + anel + check desenhados) → confetti único →
 * conteúdo escalonado. O CTA converte o pagamento em evento criado — é o
 * passo onde o onboarding antigo deixava o utilizador cair.
 */
const CheckoutSuccessModal = ({ isOpen, planKey, tierKey, billingCycle, onClose }) => {
  const { t } = useTranslation(['billing']);
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const confettiRef = useRef(null);

  useEffect(() => {
    if (!isOpen || reducedMotion || !confettiRef.current) return undefined;
    const canvas = confettiRef.current;
    let cancel;
    const timer = setTimeout(() => { cancel = burstConfetti(canvas); }, 1050);
    return () => {
      clearTimeout(timer);
      cancel?.();
    };
  }, [isOpen, reducedMotion]);

  const receipt = deriveReceipt(planKey, tierKey, billingCycle, t);

  const handleCreateEvent = () => {
    navigate('/app/register-event');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      centered
      animation="scale"
      showCloseButton={false}
      ariaLabelledby="checkout-success-title"
    >
      <div className="relative overflow-hidden bg-background-surface dark:bg-background-surface-dark px-8 pt-11 pb-8 text-center">
        <canvas ref={confettiRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />

        {/* Selo: disco com pop, anel e check desenhados por pathLength */}
        <motion.div
          className="relative mx-auto mb-2 h-24 w-24"
          aria-hidden="true"
          initial={reducedMotion ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.25 }}
        >
          <svg viewBox="0 0 96 96" className="h-full w-full">
            <circle cx="48" cy="48" r="40" className="fill-success-50 dark:fill-success-900/40" />
            <motion.circle
              cx="48" cy="48" r="42" fill="none" strokeWidth="3" strokeLinecap="round"
              className="stroke-success-500 dark:stroke-success-400"
              transform="rotate(-90 48 48)"
              initial={reducedMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.7, ease: 'easeInOut', delay: 0.35 }}
            />
            <motion.path
              d="M32 49 L43.5 60.5 L65 37" fill="none" strokeWidth="6"
              strokeLinecap="round" strokeLinejoin="round"
              className="stroke-success-600 dark:stroke-success-400"
              initial={reducedMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, ease: 'easeInOut', delay: 0.9 }}
            />
          </svg>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : 'hidden'}
          animate="visible"
          transition={{ staggerChildren: 0.15, delayChildren: 1.05 }}
        >
          <motion.h2
            variants={rise}
            id="checkout-success-title"
            className="font-display mt-3 text-2xl font-semibold text-foreground"
          >
            {t('checkoutSuccess.title')}
          </motion.h2>

          <motion.p
            variants={rise}
            className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-text-600 dark:text-text-300"
          >
            {t(SUBTITLE_KEYS[planKey] ?? 'checkoutSuccess.subtitle.generic')}
          </motion.p>

          {receipt && (
            <motion.div
              variants={rise}
              className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-background-200 dark:border-background-700 bg-background-surface-hover dark:bg-background-surface-hover-dark px-4 py-3.5 text-left"
            >
              <div>
                <p className="text-sm font-bold text-foreground">{receipt.name}</p>
                <p className="mt-0.5 text-xs text-text-600 dark:text-text-300">{receipt.detail}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold tabular-nums text-foreground">{formatEUR(receipt.amount)}</p>
                <p className="mt-0.5 text-xs font-semibold text-success-600 dark:text-success-400">
                  {t('checkoutSuccess.paid')} ✓
                </p>
              </div>
            </motion.div>
          )}

          <motion.div variants={rise} className="mt-6">
            <Button variant="primary" size="lg" className="w-full" onClick={handleCreateEvent}>
              {t(CTA_KEYS[planKey] ?? 'checkoutSuccess.cta.generic')}
            </Button>
            <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={onClose}>
              {t('checkoutSuccess.secondary')}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </Modal>
  );
};

CheckoutSuccessModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  planKey: PropTypes.string,
  tierKey: PropTypes.string,
  billingCycle: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default CheckoutSuccessModal;
