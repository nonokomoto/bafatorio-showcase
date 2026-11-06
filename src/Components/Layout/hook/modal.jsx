import { Modal as UIModal } from '../../../Components/UI';
import PropTypes from 'prop-types';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <UIModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      animation="fade"
      backdrop="blur"
    >
      {children}
    </UIModal>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired
};

export default Modal;