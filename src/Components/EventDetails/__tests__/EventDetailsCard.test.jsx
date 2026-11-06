import { render, screen, fireEvent } from '@testing-library/react';

// t devolve o fallback (2º arg) quando existe, senão a própria chave.
// initReactI18next fica como stub — o i18n/config.js (via formatDate) usa-o no init.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, fallback) => fallback || key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// react-icons (fi/lu): stub para qualquer ícone (evita a resolução ESM no jest).
jest.mock('react-icons/fi', () => new Proxy({ __esModule: true }, {
  get: (target, prop) => (prop in target ? target[prop] : () => null),
}));
jest.mock('react-icons/lu', () => new Proxy({ __esModule: true }, {
  get: (target, prop) => (prop in target ? target[prop] : () => null),
}));

// Mantém o teste focado no gate/estrutura, não nas internals do design system.
jest.mock('../../UI', () => {
  const Modal = ({ children, isOpen }) => (isOpen ? <div role="dialog">{children}</div> : null);
  Modal.displayName = 'Modal';
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Header.displayName = 'Modal.Header';
  Modal.Body = ({ children }) => <div>{children}</div>;
  Modal.Body.displayName = 'Modal.Body';
  const Card = ({ children }) => <div>{children}</div>;
  Card.displayName = 'Card';
  const Text = ({ children }) => <span>{children}</span>;
  Text.displayName = 'Text';
  const Badge = ({ children }) => <span>{children}</span>;
  Badge.displayName = 'Badge';
  return { Card, Text, Badge, Modal };
});

jest.mock('../../SafeEmailLink', () => {
  const SafeEmailLink = ({ email }) => <a href={`mailto:${email}`}>{email}</a>;
  SafeEmailLink.displayName = 'SafeEmailLink';
  return SafeEmailLink;
});

// framer-motion: render sem animação real.
jest.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = ({ children, ...props }) => {
    ['initial', 'animate', 'exit', 'transition', 'variants'].forEach((k) => delete props[k]);
    return React.createElement('div', props, children);
  };
  MotionDiv.displayName = 'MotionDiv';
  const Passthrough = ({ children }) => children;
  Passthrough.displayName = 'AnimatePresence';
  return {
    motion: { div: MotionDiv },
    AnimatePresence: Passthrough,
    useReducedMotion: () => true,
  };
});

import EventDetailsCard from '../EventDetailsCard';

const baseEvent = {
  eventLocation: 'Lisboa',
  eventManager: 'Sofia Marques',
  eventManagerEmail: 'sofia@bafatorio.pt',
  eventManagerPhone: '+351 210 000 000',
  categories: ['corporate'],
  description: 'Descrição do evento',
  eventType: 'private',
  eventTime: null,
};

describe('EventDetailsCard — gate financeiro', () => {
  it('mostra a secção Resumo Financeiro quando canViewFinancial é true', () => {
    render(
      <EventDetailsCard
        event={baseEvent}
        participantCount={48}
        totalDependents={6}
        budget={45000}
        committedExpenses={28400}
        effectiveExpenses={0}
        canViewFinancial
      />,
    );
    expect(screen.getByText('Resumo Financeiro')).toBeInTheDocument();
    expect(screen.getByText('Comprometidas')).toBeInTheDocument();
    expect(screen.getByText('Disponível')).toBeInTheDocument();
  });

  it('NÃO renderiza a secção financeira quando canViewFinancial é false', () => {
    render(
      <EventDetailsCard
        event={baseEvent}
        participantCount={48}
        totalDependents={6}
        canViewFinancial={false}
      />,
    );
    expect(screen.queryByText('Resumo Financeiro')).not.toBeInTheDocument();
    expect(screen.queryByText('Comprometidas')).not.toBeInTheDocument();
  });

  it('gate por omissão: sem a prop, o financeiro não aparece (default false)', () => {
    render(
      <EventDetailsCard event={baseEvent} participantCount={0} totalDependents={0} />,
    );
    expect(screen.queryByText('Resumo Financeiro')).not.toBeInTheDocument();
  });

  it('o ícone (i) abre o modal com a explicação da origem dos valores', () => {
    render(
      <EventDetailsCard
        event={baseEvent}
        participantCount={0}
        totalDependents={0}
        budget={45000}
        committedExpenses={0}
        effectiveExpenses={0}
        canViewFinancial
      />,
    );
    // Modal fechado por omissão
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Clicar no (i) — aria-label vem de financial.info.trigger (fallback = chave no mock)
    fireEvent.click(screen.getByLabelText('financial.info.trigger'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Título e fórmula presentes (chaves i18n resolvidas para o fallback/chave)
    expect(screen.getByText('financial.info.title')).toBeInTheDocument();
    expect(screen.getByText('financial.info.formula')).toBeInTheDocument();
  });
});
