import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportSuppliersModal from '../ImportSupplierModal';
import { useNormalizeFile } from '../../../Hook/useNormalizeFile';
import { useSelector } from 'react-redux';
import {
  useImportNormalizedSuppliersMutation,
  useUploadSupplierMutation,
} from '../../../Api/services/supplierApi';
import { downloadSupplierImportTemplate } from '../utils/exportSuppliers';

jest.mock('exceljs', () => ({ __esModule: true, default: { Workbook: jest.fn() } }));
jest.mock('papaparse', () => ({ __esModule: true, default: { parse: jest.fn() } }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, arg) => (arg && typeof arg === 'object' ? `${key}::${JSON.stringify(arg)}` : arg || key),
  }),
}));

jest.mock('react-icons/fi', () => ({
  FiX: () => <span />,
  FiUpload: () => <span />,
  FiCheck: () => <span />,
  FiAlertTriangle: () => <span />,
  FiUserPlus: () => <span />,
  FiInfo: () => <span />,
  FiDownload: () => <span />,
}));

jest.mock('../../UI', () => ({
  Modal: Object.assign(
    ({ isOpen, children }) => (isOpen ? <div>{children}</div> : null),
    {
      Body: ({ children, ...rest }) => <div {...rest}>{children}</div>,
      Footer: ({ children }) => <div>{children}</div>,
    },
  ),
  Text: ({ children, ...rest }) => <span {...rest}>{children}</span>,
  Button: ({ children, onClick, disabled, type }) => (
    <button type={type || 'button'} onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../Redux/Suppliers/supplierSlice', () => ({ selectAllSuppliers: jest.fn() }));
jest.mock('../../../Hook/useNormalizeFile', () => ({ useNormalizeFile: jest.fn() }));
jest.mock('../../../Api/services/supplierApi', () => ({
  useImportNormalizedSuppliersMutation: jest.fn(),
  useUploadSupplierMutation: jest.fn(),
}));
jest.mock('../utils/exportSuppliers', () => ({
  downloadSupplierImportTemplate: jest.fn(),
  SUPPLIER_TEMPLATE_COLUMNS: [],
}));

// Bug flagged by nonokomoto on PR #209: handleDownloadTemplate was async with
// no .catch on its onClick — a failed lazy ExcelJS chunk load (e.g. a stale
// chunk after a deploy) left the user with no feedback, just a console
// unhandled-rejection.
describe('ImportSupplierModal — template download failure feedback', () => {
  beforeEach(() => {
    useSelector.mockReturnValue([]);
    useNormalizeFile.mockReturnValue({
      normalize: jest.fn(),
      reset: jest.fn(),
      data: null,
      summary: null,
    });
    useImportNormalizedSuppliersMutation.mockReturnValue([jest.fn(), {}]);
    useUploadSupplierMutation.mockReturnValue([jest.fn(), {}]);
  });

  it('shows an error and moves to the error phase when the template download rejects', async () => {
    downloadSupplierImportTemplate.mockRejectedValue(new Error('chunk load failed'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<ImportSuppliersModal isOpen onClose={jest.fn()} />);

    fireEvent.click(screen.getByText('importModal.upload.templateButton'));

    await waitFor(() => expect(screen.getByText('importModal.error.title')).toBeInTheDocument());
    expect(screen.getByText('importModal.error.templateDownloadFailed')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
