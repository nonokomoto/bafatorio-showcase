import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportSuppliersModal from '../ImportSupplierModal';
import { useNormalizeFile } from '../../../Hook/useNormalizeFile';
import { useSelector } from 'react-redux';
import {
  useImportNormalizedSuppliersMutation,
  useUploadSupplierMutation,
} from '../../../Api/services/supplierApi';

// ExcelJS resolves to a browser bundle under Jest's jsdom "frontend" project
// and fails to parse (see ImportSupplierModal.nameHeader.test.js) — the
// success path under test never touches it, so a bare stub is enough.
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

// Bug flagged by nonokomoto on PR #209: with no offset in the mutation call,
// a >500-row file numbers every 500-row chunk's rowErrors from row 2, so the
// user sees three overlapping "row 2 to 501" ranges instead of the real rows.
describe('ImportSupplierModal — chunked import passes the chunk offset', () => {
  it('calls importNormalizedSuppliers once per 500-row chunk, each with its own rowOffset', async () => {
    const rows = Array.from({ length: 1200 }, (_, i) => ({ name: `Supplier ${i}` }));
    useSelector.mockReturnValue([]);
    useNormalizeFile.mockReturnValue({
      normalize: jest.fn().mockResolvedValue({ data: rows }),
      reset: jest.fn(),
      data: rows,
      summary: { valid: rows.length, invalid: 0 },
    });

    const importNormalizedSuppliers = jest.fn(() => ({
      unwrap: () => Promise.resolve({ success: true, reason: 'SUCCESS', supplierCount: 500, skippedCount: 0, rowErrors: [] }),
    }));
    useImportNormalizedSuppliersMutation.mockReturnValue([importNormalizedSuppliers, {}]);
    useUploadSupplierMutation.mockReturnValue([jest.fn(), {}]);

    const { container } = render(<ImportSuppliersModal isOpen onClose={jest.fn()} />);
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(['x'], 'suppliers.xlsx')] } });
    await screen.findByText('importModal.buttons.import::{"count":1200}');
    fireEvent.click(screen.getByText('importModal.buttons.import::{"count":1200}'));
    await waitFor(() => expect(screen.getByText('importModal.success.title')).toBeInTheDocument());

    expect(importNormalizedSuppliers).toHaveBeenCalledTimes(3);
    expect(importNormalizedSuppliers.mock.calls[0][0]).toMatchObject({ rowOffset: 0 });
    expect(importNormalizedSuppliers.mock.calls[0][0].suppliers).toHaveLength(500);
    expect(importNormalizedSuppliers.mock.calls[1][0]).toMatchObject({ rowOffset: 500 });
    expect(importNormalizedSuppliers.mock.calls[2][0]).toMatchObject({ rowOffset: 1000 });
    expect(importNormalizedSuppliers.mock.calls[2][0].suppliers).toHaveLength(200);
  });
});
