import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddSupplierPanel from '../AddSupplierPanel';
import { useCreateSupplierMutation } from '../../../Api/services/supplierApi';
import { useSelectEventSupplierMutation } from '../../../Api/services/eventSupplierApi';

// --- API hook mocks ---
jest.mock('../../../Api/services/supplierApi', () => ({
    useCreateSupplierMutation: jest.fn(),
}));

jest.mock('../../../Api/services/eventSupplierApi', () => ({
    useSelectEventSupplierMutation: jest.fn(),
}));

// --- i18n: return fallback (2nd arg) or namespaced key as-is ---
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, defaultValue) => defaultValue || key,
    }),
}));

// --- react-icons stubs ---
jest.mock('react-icons/fi', () => ({
    FiUserPlus: () => <span data-testid="icon-user-plus" />,
    FiList: () => <span data-testid="icon-list" />,
    FiUser: () => <span />,
    FiMail: () => <span />,
    FiPhone: () => <span />,
    FiGlobe: () => <span />,
    FiTag: () => <span />,
    FiMapPin: () => <span />,
    FiFileText: () => <span />,
    FiCreditCard: () => <span />,
    FiHome: () => <span />,
}));

// --- DetailPanelShell: render children when open, nothing otherwise ---
jest.mock('../../UI/DetailPanelShell', () => ({
    __esModule: true,
    default: ({ isOpen, children }) =>
        isOpen ? <div data-testid="panel-shell">{children}</div> : null,
}));

// --- UI primitives ---
jest.mock('../../UI', () => {
    const Button = function MockButton({ children, onClick, disabled, type, form, ...rest }) {
        return (
            <button type={type || 'button'} onClick={onClick} disabled={disabled} form={form} {...rest}>
                {children}
            </button>
        );
    };
    const Text = function MockText({ children, ...rest }) { return <span {...rest}>{children}</span>; };
    return { Button, Text };
});

// --- Heavy children used by the "list" tab: render minimal stubs ---
jest.mock('../SupplierControls', () => function MockSupplierControls() { return <div data-testid="supplier-controls" />; });

jest.mock('../SupplierList', () => function MockSupplierList({ onSupplierSelect, selectedSupplierId }) {
    return (
        <div data-testid="supplier-list">
            <button type="button" onClick={() => onSupplierSelect && onSupplierSelect('sup-123')}>
                pick-sup-123
            </button>
            <span data-testid="selected-id">{selectedSupplierId || ''}</span>
        </div>
    );
});

// --- Manual tab form fields: render only a name input so RHF has state to submit ---
jest.mock('../SupplierFormFields', () => function MockSupplierFormFields({ register }) {
    return (
        <div data-testid="supplier-form-fields">
            <input data-testid="manual-name" {...register('name')} />
        </div>
    );
});

const EVENT_ID = 'evt-1';

const makeMutationHook = ({ resolved, rejected, isLoading = false } = {}) => {
    const unwrap = jest.fn(() => {
        if (rejected) return Promise.reject(rejected);
        return Promise.resolve(resolved ?? {});
    });
    const trigger = jest.fn(() => ({ unwrap }));
    return [trigger, { isLoading }, { trigger, unwrap }];
};

const renderPanel = (overrides = {}) =>
    render(
        <AddSupplierPanel
            isOpen={true}
            onClose={jest.fn()}
            eventId={EVENT_ID}
            suppliers={[]}
            existingCategories={[]}
            isLoadingSuppliers={false}
            canManageSuppliers={true}
            canSelectSupplier={true}
            {...overrides}
        />,
    );

describe('AddSupplierPanel', () => {
    let createHookHandle;
    let selectHookHandle;

    beforeEach(() => {
        useCreateSupplierMutation.mockReset();
        useSelectEventSupplierMutation.mockReset();

        const [createTrigger, createMeta, createHandle] = makeMutationHook({ resolved: { id: 'new-supplier-1' } });
        const [selectTrigger, selectMeta, selectHandle] = makeMutationHook();

        useCreateSupplierMutation.mockReturnValue([createTrigger, createMeta]);
        useSelectEventSupplierMutation.mockReturnValue([selectTrigger, selectMeta]);

        createHookHandle = createHandle;
        selectHookHandle = selectHandle;
    });

    describe('tab filtering by permission', () => {
        test('shows both tabs when user has manage + select permissions', () => {
            renderPanel();
            expect(screen.getByRole('tab', { name: /from list/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /manual/i })).toBeInTheDocument();
        });

        test('hides manual tab when user cannot manage suppliers', () => {
            renderPanel({ canManageSuppliers: false });
            expect(screen.getByTestId('supplier-list')).toBeInTheDocument();
            expect(screen.queryByRole('tab', { name: /manual/i })).not.toBeInTheDocument();
        });

        test('hides list tab when user cannot select suppliers', () => {
            renderPanel({ canSelectSupplier: false });
            expect(screen.getByTestId('supplier-form-fields')).toBeInTheDocument();
            expect(screen.queryByRole('tab', { name: /from list/i })).not.toBeInTheDocument();
        });
    });

    describe('associate from list', () => {
        test('CTA disabled until a supplier is selected', () => {
            renderPanel();
            const cta = screen.getByRole('button', { name: /associate supplier/i });
            expect(cta).toBeDisabled();
        });

        test('calls selectEventSupplier with eventId + supplierId on confirm', async () => {
            const onClose = jest.fn();
            renderPanel({ onClose });

            fireEvent.click(screen.getByText('pick-sup-123'));
            const cta = screen.getByRole('button', { name: /associate supplier/i });
            await waitFor(() => expect(cta).not.toBeDisabled());
            fireEvent.click(cta);

            await waitFor(() => {
                expect(selectHookHandle.trigger).toHaveBeenCalledWith({
                    eventId: EVENT_ID,
                    supplierId: 'sup-123',
                });
                expect(onClose).toHaveBeenCalled();
            });
        });
    });

    describe('manual submit error handling', () => {
        test('renders translated error (never backend message) when createSupplier rejects', async () => {
            // Simulate a backend error that includes a raw internal message —
            // the UI must NOT leak this string to the user. Copilot review on
            // #84 flagged that the old behavior leaked err.data.message
            // directly; we now always show the translated fallback.
            const apiError = { data: { message: 'Duplicate VAT on supplier.vatNumber column' } };
            const [createTrigger] = makeMutationHook({ rejected: apiError });
            useCreateSupplierMutation.mockReturnValue([createTrigger, { isLoading: false }]);

            renderPanel();
            fireEvent.click(screen.getByRole('tab', { name: /manual/i }));

            fireEvent.change(screen.getByTestId('manual-name'), { target: { value: 'Acme' } });
            fireEvent.click(screen.getByRole('button', { name: /create and associate/i }));

            expect(
                await screen.findByText(/Could not create the supplier/i),
            ).toBeInTheDocument();
            // Raw backend string must never hit the UI.
            expect(screen.queryByText(/Duplicate VAT/i)).not.toBeInTheDocument();
            expect(selectHookHandle.trigger).not.toHaveBeenCalled();
        });

        test('distinguishes partial failure: create succeeds then associate fails', async () => {
            // Create resolves with an id, but associate rejects. The UI must
            // tell the user the supplier IS in the catalog and can be picked
            // manually — not a generic "creation failed" that would hide the
            // recoverable orphan from them.
            const created = { id: 'sup-new' };
            const [createTrigger] = makeMutationHook({ resolved: created });
            useCreateSupplierMutation.mockReturnValue([createTrigger, { isLoading: false }]);

            selectHookHandle.trigger.mockReturnValueOnce({
                unwrap: () => Promise.reject({ data: { message: 'Boom' } }),
            });

            renderPanel();
            fireEvent.click(screen.getByRole('tab', { name: /manual/i }));

            fireEvent.change(screen.getByTestId('manual-name'), { target: { value: 'Acme' } });
            fireEvent.click(screen.getByRole('button', { name: /create and associate/i }));

            expect(
                await screen.findByText(/created in the catalog/i),
            ).toBeInTheDocument();
            // Create WAS called; select WAS called; both with our record.
            expect(createTrigger).toHaveBeenCalled();
            expect(selectHookHandle.trigger).toHaveBeenCalledWith({
                eventId: EVENT_ID,
                supplierId: 'sup-new',
            });
        });

        test('chains createSupplier → selectEventSupplier on success and closes panel', async () => {
            const onClose = jest.fn();
            renderPanel({ onClose });
            fireEvent.click(screen.getByRole('tab', { name: /manual/i }));

            fireEvent.change(screen.getByTestId('manual-name'), { target: { value: 'Acme' } });
            fireEvent.click(screen.getByRole('button', { name: /create and associate/i }));

            await waitFor(() => {
                expect(createHookHandle.trigger).toHaveBeenCalledTimes(1);
                expect(selectHookHandle.trigger).toHaveBeenCalledWith({
                    eventId: EVENT_ID,
                    supplierId: 'new-supplier-1',
                });
                expect(onClose).toHaveBeenCalled();
            });
        });
    });
});
