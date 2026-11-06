import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportSuppliersModal from '../ImportSupplierModal';
import { useNormalizeFile } from '../../../Hook/useNormalizeFile';
import { useSelector } from 'react-redux';
import {
  useImportNormalizedSuppliersMutation,
  useUploadSupplierMutation,
} from '../../../Api/services/supplierApi';

// ExcelJS resolves to a browser bundle under Jest's jsdom "frontend" project
// and fails to parse (see ImportSupplierModal.nameHeader.test.js). The legacy
// fallback path (normalize() rejects) calls getFallbackPreviewStats, which
// needs a Workbook whose .xlsx.load resolves and whose worksheet lookup can
// return "no sheet" cleanly — enough shape to reach the preview phase without
// pulling in the real library.
jest.mock('exceljs', () => ({
  __esModule: true,
  default: {
    Workbook: jest.fn().mockImplementation(() => ({
      xlsx: { load: jest.fn().mockResolvedValue(undefined) },
      getWorksheet: jest.fn().mockReturnValue(null),
      worksheets: [],
    })),
  },
}));
jest.mock('papaparse', () => ({ __esModule: true, default: { parse: jest.fn() } }));

// t echoes the key; for interpolation calls (2nd arg is an object) it appends
// the payload so assertions can target exact interpolated values.
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

const ROWS = [{ name: 'Supplier A' }];

const setup = ({ importResult }) => {
  useSelector.mockReturnValue([]);
  useNormalizeFile.mockReturnValue({
    normalize: jest.fn().mockResolvedValue({ data: ROWS }),
    reset: jest.fn(),
    data: ROWS,
    summary: { valid: ROWS.length, invalid: 0 },
  });

  const importNormalizedSuppliers = jest.fn(() => ({ unwrap: () => Promise.resolve(importResult) }));
  useImportNormalizedSuppliersMutation.mockReturnValue([importNormalizedSuppliers, {}]);
  useUploadSupplierMutation.mockReturnValue([jest.fn(), {}]);

  return { importNormalizedSuppliers };
};

const openPreviewAndSubmit = async (container) => {
  const input = container.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [new File(['x'], 'suppliers.xlsx')] } });
  await screen.findByText('importModal.buttons.import::{"count":1}');
  fireEvent.click(screen.getByText('importModal.buttons.import::{"count":1}'));
  await waitFor(() => expect(screen.getByText('importModal.success.title')).toBeInTheDocument());
};

describe('ImportSupplierModal — row-error detail on partial success', () => {
  it('shows the row-error list on the success screen and does not schedule an auto-close when rows were skipped', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const onClose = jest.fn();
    setup({
      importResult: {
        success: true,
        reason: 'SUCCESS_WITH_SKIPS',
        supplierCount: 1,
        skippedCount: 1,
        rowErrors: [{ row: 3, message: 'Duplicate supplier skipped.' }],
      },
    });

    const { container } = render(<ImportSuppliersModal isOpen onClose={onClose} />);
    await openPreviewAndSubmit(container);

    expect(screen.getByText('importModal.error.rowErrorsTitle')).toBeInTheDocument();
    expect(screen.getByText('Duplicate supplier skipped.')).toBeInTheDocument();
    expect(setTimeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 2000);

    // Issue #212 item 3: this result came from the AI-normalized path
    // (useImportNormalizedSuppliersMutation), so its row number is an
    // estimate — the UI marks it and shows the approximate-note caption.
    expect(screen.getByText('importModal.error.rowLabel::{"row":"~3"}')).toBeInTheDocument();
    expect(screen.getByText('importModal.error.rowErrorsApproximateNote')).toBeInTheDocument();

    setTimeoutSpy.mockRestore();
  });

  it('shows exact (non-approximate) row numbers for the legacy/CSV fallback path', async () => {
    useSelector.mockReturnValue([]);
    useNormalizeFile.mockReturnValue({
      normalize: jest.fn().mockRejectedValue(new Error('AI normalization unavailable')),
      reset: jest.fn(),
      data: null,
      summary: null,
    });
    useImportNormalizedSuppliersMutation.mockReturnValue([jest.fn(), {}]);
    const uploadSupplier = jest.fn(() => ({
      unwrap: () => Promise.resolve({
        success: true,
        reason: 'SUCCESS_WITH_SKIPS',
        supplierCount: 1,
        skippedCount: 1,
        rowErrors: [{ row: 3, message: 'Duplicate supplier skipped.' }],
      }),
    }));
    useUploadSupplierMutation.mockReturnValue([uploadSupplier, {}]);

    const { container } = render(<ImportSuppliersModal isOpen onClose={jest.fn()} />);
    const input = container.querySelector('input[type="file"]');
    // jsdom's File doesn't implement arrayBuffer() — getFallbackPreviewStats needs it.
    const file = new File(['x'], 'suppliers.xlsx');
    file.arrayBuffer = () => Promise.resolve(new ArrayBuffer(0));
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByText('importModal.buttons.import::{"count":"?"}');
    fireEvent.click(screen.getByText('importModal.buttons.import::{"count":"?"}'));
    await waitFor(() => expect(screen.getByText('importModal.success.title')).toBeInTheDocument());

    expect(screen.getByText('importModal.error.rowLabel::{"row":3}')).toBeInTheDocument();
    expect(screen.queryByText('importModal.error.rowErrorsApproximateNote')).not.toBeInTheDocument();
  });

  it('still schedules the auto-close after a full success with no skipped rows', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const onClose = jest.fn();
    setup({
      importResult: {
        success: true,
        reason: 'SUCCESS',
        supplierCount: 1,
        skippedCount: 0,
        rowErrors: [],
      },
    });

    const { container } = render(<ImportSuppliersModal isOpen onClose={onClose} />);
    await openPreviewAndSubmit(container);

    expect(screen.queryByText('importModal.error.rowErrorsTitle')).not.toBeInTheDocument();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);

    setTimeoutSpy.mockRestore();
  });
});
