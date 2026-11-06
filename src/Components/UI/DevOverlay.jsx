import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Lottie from 'lottie-react';
import codingAnimation from '../../assets/animations/coding.json';

// ---------------------------------------------------------------------------
// OverlayContent — conteúdo partilhado por DevOverlay e WipGuard (sem card)
// ---------------------------------------------------------------------------
const OverlayContent = ({ badgeLabel, badgeDescription }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 16, transition: { duration: 0.18, ease: 'easeIn' } }}
    transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.08 }}
    className="flex flex-col items-center -mt-6"
  >
    {/* Lottie animation */}
    <Lottie
      animationData={codingAnimation}
      loop
      aria-hidden="true"
      style={{ width: 260, height: 260 }}
    />

    {/* Texto — sobe para encostar à animação */}
    <div className="flex flex-col items-center gap-2.5 mt-6">
      {/* Indicador pulsante + label */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <motion.span
            aria-hidden="true"
            animate={{ scale: [1, 2], opacity: [0.55, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full bg-primary-400 dark:bg-primary-500"
          />
          <span className="relative h-2.5 w-2.5 rounded-full bg-primary-500 dark:bg-primary-400" />
        </span>

        <span className="font-display text-base font-semibold tracking-wider uppercase text-primary-600 dark:text-primary-300 whitespace-nowrap">
          {badgeLabel}
        </span>
      </div>

      {/* Descrição */}
      {badgeDescription && (
        <p className="font-sans text-[13px] text-text-400 dark:text-text-500 text-center leading-relaxed max-w-[280px]">
          {badgeDescription}
        </p>
      )}
    </div>
  </motion.div>
);

OverlayContent.propTypes = {
  badgeLabel: PropTypes.string.isRequired,
  badgeDescription: PropTypes.string,
};

// ---------------------------------------------------------------------------
// Backdrop partilhado (glassmorphism)
// ---------------------------------------------------------------------------
const BACKDROP_CLASS = 'flex items-center justify-center bg-card/55';
const BACKDROP_STYLE = {
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
};

/**
 * DevOverlay — sobrepõe visualmente um componente para indicar que está
 * em desenvolvimento activo. Bloqueia toda a interacção do utilizador.
 *
 * Dois modos de uso:
 *
 * 1. Secções não-modal (wrapper):
 *    <DevOverlay active={WIP_COMPONENTS.REPORTS}>
 *      <RelatoriosSection />
 *    </DevOverlay>
 *
 * 2. Dentro de Modal (via prop `wip` — sem children):
 *    <DevOverlay className="absolute inset-0 z-20 rounded-xl overflow-hidden" />
 */
const DevOverlay = ({
  children = null,
  active = true,
  message,
  description,
  blur = true,
  className = 'relative',
}) => {
  const { t } = useTranslation('common');

  const badgeLabel    = message     || t('devOverlay.badge');
  const badgeDescription = description ?? t('devOverlay.description');

  return (
    <div className={className}>
      {/* Conteúdo — desfocado e não interactivo quando overlay activo */}
      {children && (
        <div
          className={active ? 'pointer-events-none select-none blur-sm' : undefined}
          aria-hidden={active ? 'true' : undefined}
        >
          {children}
        </div>
      )}

      <AnimatePresence>
        {active && (
          <motion.div
            key="dev-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className={`absolute inset-0 z-20 overflow-hidden ${BACKDROP_CLASS}`}
            style={blur ? BACKDROP_STYLE : undefined}
            aria-label={badgeLabel}
            role="status"
          >
            <OverlayContent badgeLabel={badgeLabel} badgeDescription={badgeDescription} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

DevOverlay.propTypes = {
  children: PropTypes.node,
  active: PropTypes.bool,
  message: PropTypes.string,
  description: PropTypes.string,
  blur: PropTypes.bool,
  className: PropTypes.string,
};

/**
 * WipGuard — intercepta uma rota ANTES do componente montar.
 *
 * Quando active=true:
 *   - Renderiza overlay absolute inset-0 via createPortal (portalId, default #main-content)
 *   - Children NÃO montam → React.lazy() não carrega o chunk → zero API calls
 *
 * Quando active=false:
 *   - Renderiza children normalmente
 *
 * Uso em App.jsx:
 *   <Route path="dashboard" element={
 *     <WipGuard active={WIP_COMPONENTS.DASHBOARD}>
 *       <Dashboard />
 *     </WipGuard>
 *   } />
 */
export const WipGuard = ({ active, children, message, description, portalId = 'main-content' }) => {
  const { t } = useTranslation('common');

  if (!active) return children;

  const badgeLabel       = message     || t('devOverlay.badge');
  const badgeDescription = description ?? t('devOverlay.description');

  const contentRoot = typeof document !== 'undefined'
    ? document.getElementById(portalId)
    : null;

  // Fallback: se o contentor não estiver disponível, não monta children de qualquer forma
  if (!contentRoot) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
      className={`absolute inset-0 z-10 ${BACKDROP_CLASS}`}
      style={BACKDROP_STYLE}
      role="status"
      aria-label={badgeLabel}
    >
      <OverlayContent badgeLabel={badgeLabel} badgeDescription={badgeDescription} />
    </motion.div>,
    contentRoot
  );
};

WipGuard.propTypes = {
  active: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
  message: PropTypes.string,
  description: PropTypes.string,
  portalId: PropTypes.string,
};

export default DevOverlay;
