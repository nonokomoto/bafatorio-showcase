import { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiEdit, FiTrash2, FiCheckCircle, FiXCircle, FiClock, FiCreditCard, FiEye, FiCheck, FiCheckSquare, FiBookmark } from 'react-icons/fi';
// Import Redux hook and selector
import { useSelector, useDispatch } from 'react-redux';
import { selectSupplierById } from '../../Redux/Suppliers/supplierSlice'; // Adjust path if needed

// Import RTK Query Hook for Approval
import { useProcessSupplierApprovalMutation, useProcessSupplierPaymentMutation } from '../../Api/services/eventSupplierApi';
import { eventApi } from '../../Api/services/eventApi'; // Importar eventApi

// Import UI Components
import { Badge, Text, Button, Dropdown, Modal, Input } from '../UI';

import { getCategoryBadgeColor, getCategoryBadgeStyle } from './utils/categoryAndStatus.js';

// "A contar" suppliers are already in the event; approving formalises the quote.
const APPROVABLE_STATUSES = ['PENDING', 'COUNTING_ON'];

// Helper to format currency. The currency is the quote's own (eventSupplier.currency,
// per ADR-027), falling back to the event currency — never the catalog supplier's.
const formatCurrency = (amount, currency) => {
    if (amount === null || amount === undefined) return '—';
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) return '—';

    try {
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: currency || 'EUR', // Default or fetched currency
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numericAmount);
    } catch (e) {
        console.error("Currency formatting error:", e);
        return `${numericAmount.toFixed(2)} ${currency || '???'}`;
    }
};

const EventSupplierListItem = ({
    eventSupplier,
    onShowSupplierDetails,
    onDelete,
    onEditAssociation,
    canEdit = true,
    canDelete = true,
    canApprove = true,
    showSelectionCheckbox = false,
    isSelected = false,
    onToggleSelection,
    eventCurrency,
}) => {
    const { t } = useTranslation(['supplier', 'common']);
    // Try to use nested supplier data from enhanced query, fallback to Redux selector
    const supplierFromRedux = useSelector(state => selectSupplierById(state, eventSupplier.supplierId));
    const supplier = eventSupplier.supplier || supplierFromRedux;
    const dispatch = useDispatch(); // Obter dispatch

    // Instantiate the approval mutation hook
    const [approveSupplier, { isLoading: isApproving }] = useProcessSupplierApprovalMutation();
    const [paySupplier, { isLoading: isPaying }] = useProcessSupplierPaymentMutation();
    
    // Estado para o modal de definição de valor
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [quoteAmount, setQuoteAmount] = useState('');
    const [quoteError, setQuoteError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Define status badge properties locally
    const getStatusBadgeProps = (status) => {
        switch (status) {
            case 'PENDING':
                return { variant: 'warning', tone: 'solid', children: t('eventSupplierList.status.pending', 'Pending'), icon: <FiClock /> };
            case 'COUNTING_ON':
                return { variant: 'secondary', tone: 'solid', children: t('eventSupplierList.status.counting_on', 'Counting on'), icon: <FiBookmark /> };
            case 'APPROVED':
                return { variant: 'primary', tone: 'solid', children: t('eventSupplierList.status.approved', 'Approved'), icon: <FiCheckCircle /> };
            case 'PAID':
                return { variant: 'success', tone: 'solid', children: t('eventSupplierList.status.paid', 'Paid'), icon: <FiCreditCard /> };
            case 'REJECTED':
                return { variant: 'error', tone: 'solid', children: t('eventSupplierList.status.rejected', 'Rejected'), icon: <FiXCircle /> };
            default:
                return { variant: 'neutral', tone: 'solid', children: status || t('eventSupplierList.status.unknown', 'Unknown') };
        }
    };
    
    const statusProps = getStatusBadgeProps(eventSupplier.status);
    const quoteFormatted = formatCurrency(eventSupplier.quoteAmount, eventSupplier.currency || eventCurrency);

    // Dropdown Trigger (similar to SupplierListItem)
    const dropdownTrigger = (
        <span 
            className="text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400 font-semibold tracking-wider px-1 py-1 rounded cursor-pointer transition-colors duration-150"
            title={t('supplier:eventSupplierList.actions.moreOptions', 'More options')}
        >
           ...
        </span>
    );

    // Handler para mudança no input de valor
    const handleQuoteAmountChange = (e) => {
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value)) {
            setQuoteAmount(value);
            setQuoteError('');
        } else if (value === '') {
            setQuoteAmount('');
            setQuoteError('');
        }
    };

    // Handler para abrir o modal de cotação
    const handleOpenQuoteModal = (e) => {
        e.stopPropagation();
        if (!eventSupplier || !APPROVABLE_STATUSES.includes(eventSupplier.status)) return;
        setQuoteAmount(eventSupplier.quoteAmount ? eventSupplier.quoteAmount.toString() : '');
        setQuoteError('');
        setShowQuoteModal(true);
    };
    
    // Handler para fechar o modal
    const handleCloseQuoteModal = () => {
        setShowQuoteModal(false);
        setQuoteAmount('');
        setQuoteError('');
    };

    // Handler para confirmar valor e aprovar
    const handleConfirmQuoteAndApprove = async () => {
        // Validar valor
        const numericQuote = parseFloat(quoteAmount);
        if (quoteAmount.trim() === '' || isNaN(numericQuote) || numericQuote <= 0) {
            setQuoteError(t('eventSupplierList.selectModal.quoteErrorInvalid', 'Please enter a valid positive number for the quote.'));
            return;
        }
        setQuoteError('');
        setIsProcessing(true);

        try {
            // Aprovação única via Lambda — quoteAmount passado directamente para
            // evitar o rules.owner() do AppSync na actualização do EventSupplier
            await approveSupplier({ eventSupplierId: eventSupplier.id, quoteAmount: numericQuote }).unwrap();
            console.log(`Successfully approved EventSupplier ${eventSupplier.id} with quote ${numericQuote}`);

            // Invalidar cache para forçar refetch automático dos dados do evento
            if (eventSupplier.eventId) {
                dispatch(
                    eventApi.util.invalidateTags([
                        { type: 'Event', id: eventSupplier.eventId },
                        'Event'
                    ])
                );
            }

            handleCloseQuoteModal();

        } catch (err) {
            console.error("Failed to update quote or approve supplier:", err);
            console.error("Error details:", {
                data: err?.data,
                message: err?.message,
                status: err?.status,
                errors: err?.errors
            });
            
            // Extract meaningful error message
            let errorMsg = t('common:errors.generic', 'An error occurred. Please try again.');
            
            if (err?.data?.errors && Array.isArray(err.data.errors)) {
                // GraphQL errors
                errorMsg = err.data.errors.map(e => e.message).join(', ');
            } else if (err?.data?.message) {
                errorMsg = err.data.message;
            } else if (err?.message) {
                errorMsg = err.message;
            }
            
            setQuoteError(errorMsg); // Mostrar erro no modal
        } finally {
            setIsProcessing(false);
        }
    };

    // Handler for Pay Action
    const handlePay = async (e) => {
        e.stopPropagation();
        if (!eventSupplier || isPaying || eventSupplier.status !== 'APPROVED') return;
        try {
            console.log(`Attempting to pay EventSupplier: ${eventSupplier.id}`);
            await paySupplier({ eventSupplierId: eventSupplier.id }).unwrap();
            // RTK Query handles refetching/state update
            console.log(`Successfully paid EventSupplier: ${eventSupplier.id}`);
            // Poderia adicionar uma notificação de sucesso aqui
        } catch (err) {
            console.error("Failed to pay supplier:", err);
            // Poderia adicionar uma notificação de erro aqui, usando err.data ou err.message
        }
    };

    // Loading state combinado para botões
    const isLoadingAction = isProcessing || isApproving;
    const canOpenDetails = Boolean(supplier?.id && onShowSupplierDetails);
    const selectedBgClass = isSelected ? 'bg-primary-50 dark:bg-primary-900/30' : '';
    const secondaryLine = eventSupplier.description || eventSupplier.externalRef || supplier?.contactEmail || null;

    const handleRowClick = () => {
        if (!canOpenDetails) return;
        onShowSupplierDetails(supplier.id);
    };

    const handleRowKeyDown = (event) => {
        if (!canOpenDetails) return;

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleRowClick();
        }
    };

    return (
        <>
            {/* Mimic SupplierListItem row structure and styling */}
            <div
                className={`odd:bg-white dark:odd:bg-background-800/60 even:bg-background-50/70 dark:even:bg-background-800/80 hover:bg-background-100/80 dark:hover:bg-background-700/70 transition-colors duration-150 ${selectedBgClass} ${canOpenDetails ? 'cursor-pointer' : ''}`}
                onClick={canOpenDetails ? handleRowClick : undefined}
                onKeyDown={canOpenDetails ? handleRowKeyDown : undefined}
                role={canOpenDetails ? 'button' : undefined}
                tabIndex={canOpenDetails ? 0 : undefined}
            >
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-background-100 dark:border-background-700 text-sm min-w-[760px]">
                    {showSelectionCheckbox && (
                        <div className="w-11 flex-shrink-0" onClick={(event) => event.stopPropagation()}>
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => onToggleSelection?.(eventSupplier.id)}
                                aria-label={t('eventSupplierList.table.selection.selectSupplier', {
                                    name: supplier?.name || t('eventSupplierList.unknownSupplier', 'Unknown Supplier'),
                                })}
                                className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500 cursor-pointer accent-primary-500"
                            />
                        </div>
                    )}

                    {/* --- Non-Editable Columns --- */}
                    {/* Supplier Name */}
                    <div className="flex-1 min-w-0 pr-2">
                        <div className="flex flex-col min-w-0">
                            <Text
                                variant="body2"
                                weight="medium"
                                className="text-text-700 dark:text-text-100 truncate"
                                title={supplier?.name || t('eventSupplierList.unknownSupplier', 'Unknown Supplier')}
                            >
                                {supplier?.name || t('eventSupplierList.unknownSupplier', 'Unknown Supplier')}
                            </Text>
                            {secondaryLine && (
                                <Text
                                    variant="caption"
                                    className="text-muted-foreground truncate mt-0.5"
                                    title={secondaryLine}
                                >
                                    {secondaryLine}
                                </Text>
                            )}
                        </div>
                    </div>
                    {/* Category */}
                    <div className="hidden lg:flex w-[120px] flex-shrink-0 pr-2 items-center">
                        {supplier?.category ? (
                            <Badge
                                variant={getCategoryBadgeColor(supplier.category)}
                                style={getCategoryBadgeStyle(supplier.category)}
                                size="sm"
                                tone="solid"
                                className="w-fit"
                            >
                                {t(`supplier:categories.${supplier.category}`, supplier.category)}
                            </Badge>
                        ) : (
                            <span className="text-[13px] text-muted-foreground">—</span>
                        )}
                    </div>

                    {/* --- Reverted Display Columns --- */}
                    {/* Column: Quote Amount - Always show Text */} 
                    <div className="hidden md:flex w-[140px] flex-shrink-0 pr-2 items-center"> 
                        <Text variant="body2" className="text-muted-foreground truncate" title={quoteFormatted}>
                            {quoteFormatted}
                        </Text>
                    </div>

                    {/* Column: Status - Always show Badge */} 
                    <div className="hidden md:flex w-[130px] flex-shrink-0 pr-2 items-center"> 
                        <Badge {...statusProps} size="sm" />
                    </div>
                    
                    {/* --- Fixed Columns --- */}
                    {/* Invoice Button - Remove disabled logic */} 
                    {/* 
                    <div className="hidden sm:flex w-[150px] flex-shrink-0 pr-2">
                        <Button
                            variant={eventSupplier.invoiceS3Key ? "outline" : "ghost"}
                            size="sm"
                            className={!eventSupplier.invoiceS3Key ? 'text-muted-foreground' : ''}
                        >
                            <FiPaperclip className="mr-1.5 h-3.5 w-3.5" />
                            {eventSupplier.invoiceS3Key ? t('eventSupplierList.invoice.view', 'View/Replace') : t('eventSupplierList.invoice.upload', 'Upload')}
                        </Button>
                    </div> 
                    */}

                    {/* Column: Actions - Always show Dropdown */} 
                    <div className="flex items-center justify-center w-[50px] flex-shrink-0 text-center relative" onClick={(event) => event.stopPropagation()}>
                        <Dropdown trigger={dropdownTrigger} menuClassName="divide-y divide-background-100 dark:divide-background-700 min-w-[180px]">
                             {/* View Supplier Details Action */}
                             <div className="py-1">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onShowSupplierDetails(supplier?.id); }}
                                    disabled={!supplier}
                                    className={`hover:bg-background-100 dark:hover:bg-background-700/60 group flex w-full items-center rounded-md px-3 py-2.5 text-sm text-text-700 dark:text-text-200 transition-colors duration-100 ${!supplier ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <FiEye className="mr-3 h-4 w-4 text-text-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-100 shrink-0" aria-hidden="true" />
                                    {t('supplier:eventSupplierList.actions.viewDetails', 'View Details')}
                                </button>
                            </div>
                            {/* Edit Association Action - Trigger Modal (requires edit permission) */}
                            {canEdit && (
                                <div className="py-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEditAssociation?.(eventSupplier); }}
                                        className={`hover:bg-background-100 dark:hover:bg-background-700/60 group flex w-full items-center rounded-md px-3 py-2.5 text-sm text-text-700 dark:text-text-200 transition-colors duration-100`}
                                    >
                                        <FiEdit className="mr-3 h-4 w-4 text-text-400 group-hover:text-secondary-600 dark:group-hover:text-secondary-400 transition-colors duration-100 shrink-0" aria-hidden="true" />
                                        {t('supplier:eventSupplierList.actions.editAssociation', 'Edit Association')}
                                    </button>
                                </div>
                            )}
                           
                            {/* Approve Action -> Opens Modal (requires approve permission) */}
                            {canApprove && APPROVABLE_STATUSES.includes(eventSupplier.status) && (
                                <div className="py-1">
                                    <button
                                        onClick={handleOpenQuoteModal} // Abre o modal
                                        disabled={isLoadingAction}
                                        className={`hover:bg-success-50 dark:hover:bg-success-900/40 group flex w-full items-center rounded-md px-3 py-2.5 text-sm text-success-700 dark:text-success-400 transition-colors duration-100 ${isLoadingAction ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <FiCheck className="mr-3 h-4 w-4 group-hover:text-success-600 dark:group-hover:text-success-500 transition-colors duration-100 shrink-0" aria-hidden="true" />
                                        {t('eventSupplierList.actions.approve', 'Approve Supplier')}
                                    </button>
                                </div>
                            )}

                            {/* Pay Action - Conditionally Rendered (requires approve permission) */}
                            {canApprove && eventSupplier.status === 'APPROVED' && (
                                <div className="py-1">
                                    <button
                                        onClick={handlePay}
                                        disabled={isPaying}
                                        className={`hover:bg-success-50 dark:hover:bg-success-900/40 group flex w-full items-center rounded-md px-3 py-2.5 text-sm text-success-700 dark:text-success-400 transition-colors duration-100 ${isPaying ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <FiCheckSquare className="mr-3 h-4 w-4 group-hover:text-success-600 dark:group-hover:text-success-500 transition-colors duration-100 shrink-0" aria-hidden="true" />
                                        {isPaying
                                            ? t('eventSupplierList.actions.markingAsPaid', 'Marking as paid...')
                                            : t('eventSupplierList.actions.markAsPaid', 'Mark as Paid')}
                                    </button>
                                </div>
                            )}

                            {/* Delete Association Action (requires delete permission) */}
                            {canDelete && (
                                <div className="py-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete?.(eventSupplier.id); }}
                                        className={`hover:bg-error-50 dark:hover:bg-error-900/40 group flex w-full items-center rounded-md px-3 py-2.5 text-sm text-error-600 dark:text-error-400 transition-colors duration-100`}
                                    >
                                        <FiTrash2 className="mr-3 h-4 w-4 group-hover:text-error-600 dark:group-hover:text-error-400 transition-colors duration-100 shrink-0" aria-hidden="true" />
                                        {t('supplier:eventSupplierList.actions.delete', 'Remove Association')}
                                    </button>
                                </div>
                            )}
                        </Dropdown>
                    </div>
                </div>
            </div>

            {/* Modal para Definição do Valor de Orçamento */}
            <Modal
                isOpen={showQuoteModal}
                onClose={handleCloseQuoteModal}
                fullWidth
            >
                <Modal.Header>
                    <Text variant="h5">{t('eventSupplierList.defineQuote.title', 'Set Quote Amount & Approve')}</Text>
                </Modal.Header>
                <Modal.Body>
                    <div className="space-y-4">
                        <Text variant="body2" className="text-muted-foreground">
                            {t('eventSupplierList.defineQuote.description', 'Enter the final quote amount for {supplierName} before approving.', { supplierName: supplier?.name || 'this supplier' })}
                        </Text>
                        <Input
                            label={t('eventSupplierList.selectModal.quoteLabel', 'Quote Amount')}
                            name="quoteAmount"
                            type="text"
                            value={quoteAmount}
                            onChange={handleQuoteAmountChange}
                            error={quoteError}
                            placeholder={t('eventSupplierList.selectModal.quotePlaceholder', 'Enter quote amount (e.g., 1250.50)')}
                            required
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="outline"
                        onClick={handleCloseQuoteModal}
                    >
                        {t('common:actions.cancel', 'Cancel')}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleConfirmQuoteAndApprove}
                        disabled={isLoadingAction || quoteAmount.trim() === ''}
                        loading={isLoadingAction}
                    >
                        {t('eventSupplierList.actions.approve', 'Approve Supplier')}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

EventSupplierListItem.propTypes = {
    eventSupplier: PropTypes.object.isRequired,
    onShowSupplierDetails: PropTypes.func.isRequired,
    onDelete: PropTypes.func,
    onEditAssociation: PropTypes.func,
    canEdit: PropTypes.bool,
    canDelete: PropTypes.bool,
    canApprove: PropTypes.bool,
    showSelectionCheckbox: PropTypes.bool,
    isSelected: PropTypes.bool,
    onToggleSelection: PropTypes.func,
    eventCurrency: PropTypes.string,
};

export default EventSupplierListItem; 
