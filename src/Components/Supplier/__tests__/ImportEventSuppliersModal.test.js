import { render, screen, fireEvent } from '@testing-library/react';
import ImportEventSuppliersModal from '../ImportEventSuppliersModal';
import { useNormalizeFile } from '../../../Hook/useNormalizeFile';
import { useEventRole } from '../../../Hook/useEventRole';

// t echoes the key; for interpolation calls (2nd arg is an object) it appends
// the payload so we can assert the exact count/currency the banner renders.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, arg) => (arg && typeof arg === 'object' ? `${key}::${JSON.stringify(arg)}` : arg || key),
  }),
}));

jest.mock('react-icons/fi', () => ({
  FiUpload: () => <span />,
  FiCheck: () => <span />,
  FiAlertTriangle: () => <span data-testid="alert-icon" />,
  FiDownload: () => <span />,
}));

jest.mock('../../UI', () => ({
  Modal: ({ isOpen, children }) => (isOpen ? <div>{children}</div> : null),
  Text: ({ children, ...rest }) => <span {...rest}>{children}</span>,
  Button: ({ children, onClick, disabled, type }) => (
    <button type={type || 'button'} onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('../../../Hook/useNormalizeFile', () => ({ useNormalizeFile: jest.fn() }));
jest.mock('../../../Hook/useEventRole', () => ({ useEventRole: jest.fn() }));
jest.mock('../../../Hook/useAuthz', () => ({
  billingGateReasonFromError: jest.fn(() => null),
  billingGateMessageKey: jest.fn(() => 'k'),
}));
jest.mock('../../../Api/services/eventSupplierApi', () => ({
  useImportNormalizedEventSuppliersMutation: () => [
    jest.fn(() => ({ unwrap: jest.fn().mockResolvedValue({}) })),
    {},
  ],
}));

const setRows = (rows) => {
  useNormalizeFile.mockReturnValue({
    normalize: jest.fn().mockResolvedValue({ data: rows }),
    reset: jest.fn(),
    data: rows,
    summary: { valid: rows.length, invalid: 0 },
    isNormalizing: false,
    errors: [],
    columnMapping: {},
    normalizeError: null,
  });
};

const openPreview = async (container) => {
  const input = container.querySelector('input[type="file"]');
  fireEvent.change(input, {
    target: { files: [new File(['x'], 'suppliers.xlsx')] },
  });
  // handleFileChange awaits normalize() then advances to the preview phase.
  // Anchored on the summary label: the preview no longer renders a row table.
  await screen.findByText('importEventSuppliersModal.preview.valid');
};

beforeEach(() => {
  useEventRole.mockReturnValue({ isStaffLogistics: false });
});

const CVE_ROW = { name: 'A', category: 'Catering', quoteAmount: 200000, currency: 'CVE', status: 'APPROVED' };
const EUR_ROW_1 = { name: 'B', category: 'AV', quoteAmount: 1500, currency: 'EUR', status: 'APPROVED' };
const EUR_ROW_2 = { name: 'C', category: 'Foto', quoteAmount: 900, currency: 'EUR', status: 'PAID' };

describe('ImportEventSuppliersModal — aviso de moeda', () => {
  it('avisa com a contagem de linhas em moeda diferente da do evento', async () => {
    setRows([CVE_ROW, EUR_ROW_1, EUR_ROW_2]);
    const { container } = render(
      <ImportEventSuppliersModal isOpen onClose={jest.fn()} eventId="evt-1" eventCurrency="CVE" />,
    );

    await openPreview(container);

    // 2 linhas EUR num evento CVE → banner com count=2 e currency=CVE.
    expect(
      screen.getByText('importEventSuppliersModal.currencyMismatch.note::{"count":2,"currency":"CVE"}'),
    ).toBeInTheDocument();
  });

  it('não avisa quando todas as linhas estão na moeda do evento', async () => {
    setRows([CVE_ROW, { ...CVE_ROW, name: 'D' }]);
    const { container } = render(
      <ImportEventSuppliersModal isOpen onClose={jest.fn()} eventId="evt-1" eventCurrency="CVE" />,
    );

    await openPreview(container);

    expect(screen.queryByTestId('alert-icon')).not.toBeInTheDocument();
    expect(screen.queryByText(/currencyMismatch\.note/)).not.toBeInTheDocument();
  });

  it('trata moeda ausente como a do evento (sem aviso)', async () => {
    setRows([CVE_ROW, { name: 'E', quoteAmount: 500, status: 'APPROVED' }]); // sem currency
    const { container } = render(
      <ImportEventSuppliersModal isOpen onClose={jest.fn()} eventId="evt-1" eventCurrency="CVE" />,
    );

    await openPreview(container);

    expect(screen.queryByText(/currencyMismatch\.note/)).not.toBeInTheDocument();
  });
});
