/**
 * @file ReportModeModal.jsx
 * @description Escolha entre relatório resumido e detalhado.
 *
 * O detalhado inclui nome, contacto e acompanhantes de cada pessoa; o
 * resumido só agregados. A escolha é do utilizador porque só ele sabe para
 * onde vai o ficheiro — a descrição de cada opção diz-lhe isso.
 */
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiUsers, FiBarChart2 } from 'react-icons/fi';

import { Badge, Button, Modal, Text } from '../UI';

const MODES = [
  { mode: 'summary', Icon: FiBarChart2 },
  { mode: 'detailed', Icon: FiUsers },
];

const ReportModeModal = ({ isOpen, onClose, onSelect }) => {
  const { t } = useTranslation('event');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" centered>
      <Modal.Header>
        {t('eventDetails.completeEventBanner.modeModal.title')}
      </Modal.Header>

      <Modal.Body>
        <Text variant="body2" className="text-muted-foreground mb-4">
          {t('eventDetails.completeEventBanner.modeModal.description')}
        </Text>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODES.map(({ mode, Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSelect(mode)}
              className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <Badge variant="primary" tone="outline" pill className="h-9 w-9 flex items-center justify-center">
                <Icon className="text-primary text-lg" />
              </Badge>
              <Text variant="body1" className="font-medium text-foreground">
                {t(`eventDetails.completeEventBanner.modeModal.${mode}.label`)}
              </Text>
              <Text variant="caption" className="text-muted-foreground">
                {t(`eventDetails.completeEventBanner.modeModal.${mode}.description`)}
              </Text>
            </button>
          ))}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          {t('eventDetails.completeEventBanner.modeModal.cancel')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

ReportModeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  // Recebe 'summary' | 'detailed'; fechar o modal é de quem gera.
  onSelect: PropTypes.func.isRequired,
};

export default ReportModeModal;
