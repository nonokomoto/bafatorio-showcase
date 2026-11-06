import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, fallback) => (typeof fallback === 'string' ? fallback : key) }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

jest.mock('react-icons/fi', () => new Proxy({ __esModule: true }, {
  get: (target, prop) => (prop in target ? target[prop] : () => null),
}));

jest.mock('../../UI', () => {
  const Card = ({ children }) => <div>{children}</div>;
  Card.displayName = 'Card';
  const Text = ({ children }) => <span>{children}</span>;
  Text.displayName = 'Text';
  return { Card, Text };
});

jest.mock('../../Participant/ParticipantAvatar', () => {
  const A = () => <span data-testid="avatar" />;
  A.displayName = 'ParticipantAvatar';
  return A;
});
jest.mock('../../Participant/RoleBadge', () => {
  const R = ({ roleName }) => <span>{roleName}</span>;
  R.displayName = 'RoleBadge';
  return R;
});
jest.mock('../../Participant/StatusBadge', () => {
  const S = ({ status }) => <span>{status}</span>;
  S.displayName = 'StatusBadge';
  return S;
});
jest.mock('../../Participant/ParticipantDetailPanel', () => {
  const P = ({ participant }) => (participant ? <div data-testid="panel">{participant.participantName}</div> : null);
  P.displayName = 'ParticipantDetailPanel';
  return P;
});

jest.mock('../../../Hook/useRoleLookup', () => ({
  useRoleLookup: () => ({ getRoleName: (id, fb) => fb || id, getRoleColor: () => null }),
}));

jest.mock('../../../Api/services/participantApi', () => ({
  useListParticipantsByEventLambdaQuery: jest.fn(),
}));

import { useListParticipantsByEventLambdaQuery } from '../../../Api/services/participantApi';
import EventParticipants from '../EventParticipants';

const PARTICIPANTS = [
  { id: '1', participantName: 'Ana Martins', participantEmail: 'ana@nova.pt', organization: 'Nova Tech', participantStatus: 'CONFIRMED', roleId: 'r1', dependentsCount: 2 },
  { id: '2', participantName: 'Bruno Costa', participantEmail: 'bruno@dev.pt', organization: 'DevHouse', participantStatus: 'REGISTERED', roleId: 'r2', dependentsCount: 0 },
];

const mockQuery = (over = {}) =>
  useListParticipantsByEventLambdaQuery.mockReturnValue({
    data: { items: PARTICIPANTS }, isLoading: false, isError: false, refetch: jest.fn(), ...over,
  });

describe('EventParticipants (read-only)', () => {
  beforeEach(() => { useListParticipantsByEventLambdaQuery.mockReset(); mockNavigate.mockReset(); });

  it('renderiza os participantes na tabela', () => {
    mockQuery();
    render(<EventParticipants eventId="e1" />);
    expect(screen.getByText('Ana Martins')).toBeInTheDocument();
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há participantes', () => {
    mockQuery({ data: { items: [] } });
    render(<EventParticipants eventId="e1" />);
    expect(screen.getByText('Ainda não há participantes neste evento.')).toBeInTheDocument();
  });

  it('a procura filtra as linhas', () => {
    mockQuery();
    render(<EventParticipants eventId="e1" />);
    fireEvent.change(screen.getByLabelText(/Procurar/i), { target: { value: 'bruno' } });
    expect(screen.queryByText('Ana Martins')).not.toBeInTheDocument();
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();
  });

  it('clicar numa linha abre o painel de detalhe', () => {
    mockQuery();
    render(<EventParticipants eventId="e1" />);
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Ana Martins'));
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });

  it('o botão Gerir só aparece com canManageParticipants', () => {
    mockQuery();
    const { rerender } = render(<EventParticipants eventId="e1" canManageParticipants={false} />);
    expect(screen.queryByText('Gerir participantes')).not.toBeInTheDocument();
    rerender(<EventParticipants eventId="e1" canManageParticipants />);
    expect(screen.getByText('Gerir participantes')).toBeInTheDocument();
  });

  it('clicar num chip de estado filtra a lista por esse estado', () => {
    mockQuery();
    render(<EventParticipants eventId="e1" />);
    // Ana é CONFIRMED, Bruno é REGISTERED. Filtrar por REGISTERED deixa só Bruno.
    // pressed:false isola o chip (aria-pressed) das linhas da tabela (role=button sem pressed).
    fireEvent.click(screen.getByRole('button', { name: /REGISTERED/i, pressed: false }));
    expect(screen.queryByText('Ana Martins')).not.toBeInTheDocument();
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();
  });

  it('o botão Gerir navega para a página dedicada', () => {
    mockQuery();
    render(<EventParticipants eventId="e1" canManageParticipants />);
    fireEvent.click(screen.getByText('Gerir participantes'));
    expect(mockNavigate).toHaveBeenCalledWith('/app/participants');
  });
});
