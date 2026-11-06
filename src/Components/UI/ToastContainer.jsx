import { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheck, FiX, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import { dismissToast } from '../../Redux/UI/toastSlice';

const VARIANT_STYLES = {
  success: { bg: 'bg-success-500', icon: FiCheck },
  error: { bg: 'bg-error-500', icon: FiX },
  warning: { bg: 'bg-warning-500', icon: FiAlertTriangle },
  info: { bg: 'bg-info-500', icon: FiInfo },
};

const Toast = ({ toast, onDismiss }) => {
  const { t } = useTranslation('participant');
  const { bg, icon: Icon } = VARIANT_STYLES[toast.variant] || VARIANT_STYLES.info;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`${bg} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 min-w-[260px] max-w-[380px]`}
    >
      <Icon size={16} className="flex-shrink-0" />
      <span className="text-sm font-medium">{t(toast.message, toast.message)}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-auto flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <FiX size={14} />
      </button>
    </motion.div>
  );
};

Toast.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    variant: PropTypes.string,
    message: PropTypes.string,
    duration: PropTypes.number,
  }).isRequired,
  onDismiss: PropTypes.func.isRequired,
};

const ToastContainer = () => {
  const queue = useSelector(state => state.toast?.queue || []);
  const dispatch = useDispatch();

  const handleDismiss = useCallback((id) => {
    dispatch(dismissToast(id));
  }, [dispatch]);

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {queue.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={handleDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
