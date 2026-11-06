import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportEventSuppliersModal from '../ImportEventSuppliersModal';
import { useNormalizeFile } from '../../../Hook/useNormalizeFile';
import { useEventRole } from '../../../Hook/useEventRole';
import { downloadSupplierImportTemplate } from '../utils/exportSuppliers';

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
jest.mock('../utils/exportSuppliers', () => ({
  downloadSupplierImportTemplate: jest.fn(),
  EVENT_SUPPLIER_TEMPLATE_COLUMNS: [],
}));

beforeEach(() => {
  useEventRole.mockReturnValue({ isStaffLogistics: false });
  useNormalizeFile.mockReturnValue({
    normalize: jest.fn(),
    reset: jest.fn(),
    data: null,
    summary: null,
    isNormalizing: false,
    errors: [],
    columnMapping: {},
    normalizeError: null,
  });
});

// Bug flagged by nonokomoto on PR #209: same missing .catch as
// ImportSupplierModal's handleDownloadTemplate — no user feedback on a
// failed template generation.
describe('ImportEventSuppliersModal — template download failure feedback', () => {
  it('shows an error when the template download rejects', async () => {
    downloadSupplierImportTemplate.mockRejectedValue(new Error('chunk load failed'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<ImportEventSuppliersModal isOpen onClose={jest.fn()} eventId="evt-1" eventCurrency="EUR" />);

    fireEvent.click(screen.getByText('importModal.upload.templateButton'));

    await waitFor(() => expect(screen.getByText('importModal.error.title')).toBeInTheDocument());
    expect(screen.getByText('importModal.error.templateDownloadFailed')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
