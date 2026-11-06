import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useAuthz, billingGateReasonFromError, billingGateMessageKey, writeBlockedTitle } from '../../Hook/useAuthz';
import { FiPlus, FiAlertTriangle, FiChevronDown, FiUpload, FiTrash2, FiSearch, FiFilter, FiPieChart } from 'react-icons/fi';
import ImportEventSuppliersModal from './ImportEventSuppliersModal';
import { useListSuppliersQuery } from '../../Api/services/supplierApi';
// Import RTK Query hook - Using Enhanced version with nested relations
import { useListEventSuppliersByEventEnhancedQuery } from '../../Api/services/eventSupplierApi';
// Import hook to delete association
import { useUpdateEventSupplierMutation, useRemoveEventSupplierMutation } from '../../Api/services/eventSupplierApi';
import { useRevertEventSupplierApprovalMutation, useAdjustApprovedEventSupplierQuoteMutation } from '../../Api/services/eventSupplierApi';

// Import UI Components
import {
    Badge,
    Card,
    Button,
    Text,
    Modal,
    Input,
    Select,
    Skeleton
} from '../UI'; // Assuming index export
import AlertPopup from '../Layout/AlertPopUp'; // For delete confirmation
import DetailPanelShell from '../UI/DetailPanelShell';
import EventSupplierListItem from './EventSupplierListItem'; // Import the new list item
import SupplierDetailContent from '../Supplier/SupplierDetailContent'; // Import for details modal
import AddSupplierPanel from './AddSupplierPanel';
import CommittedByCategoryModal from './CommittedByCategoryModal';
import {
    summarizeEventSupplierTotals,
    summarizeByCategory,
    filterEventSuppliers,
    formatCurrencyEntries,
    NO_CATEGORY,
} from './utils/eventSupplierTotals';
import { useTableSelection } from '../../Hook/useTableSelection';

// Define Status Options outside the component
const STATUS_OPTIONS = [
    { value: 'PENDING', labelKey: 'eventSupplierList.status.pending' },
    { value: 'COUNTING_ON', labelKey: 'eventSupplierList.status.counting_on' },
    { value: 'APPROVED', labelKey: 'eventSupplierList.status.approved' },
    { value: 'PAID', labelKey: 'eventSupplierList.status.paid' },
    { value: 'REJECTED', labelKey: 'eventSupplierList.status.rejected' },
];

// Statuses that never hold money in the event balances, so they can be swapped
// freely through the standard update (COUNTING_ON = "A contar": in the event
// without a formally approved quote).
const NON_COMMITTED_STATUSES = ['PENDING', 'COUNTING_ON', 'REJECTED'];

const EventSupplierList = ({ eventId, eventCurrency, canManageSuppliers, canEditSuppliers, canDeleteSuppliers, canSelectSupplier, canApproveSuppliers }) => {
    const { t } = useTranslation(['supplier', 'common']);

    // Permission flags (received as props from parent, resolved from ADR-015 matrix).
    // canAdd conflates CREATE + SELECT because the "Add" button opens a panel that
    // offers both paths; the panel itself gates its Manual tab with canManageSuppliers.
    // Gate cosmético do plano (§4b): X/10 no Starter + janela de escrita.
    const { limit: authzLimit, writable, reason: accessReason } = useAuthz(eventId);
    // RBAC ∧ entitlement: em evento read-only as ações de escrita por item
    // (editar/aprovar/pagar/remover) saem do dropdown — fica só "Ver detalhes";
    // o ReadOnlyBanner da página explica o motivo. As Lambdas continuam a autoridade.
    const canAdd = canManageSuppliers || canSelectSupplier;
    const canEdit = canEditSuppliers && writable;
    const canDelete = canDeleteSuppliers && writable;
    const canApprove = canApproveSuppliers && writable;

    // --- State ---
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // Store ID to delete
    const [isAddPanelOpen, setIsAddPanelOpen] = useState(false); // Slide-in panel (list + manual tabs)
    const [isSupplierDetailModalOpen, setIsSupplierDetailModalOpen] = useState(false); // State for supplier detail modal
    const [selectedSupplierIdForDetail, setSelectedSupplierIdForDetail] = useState(null); // State for selected supplier ID for details
    // New state for Edit Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEventSupplier, setEditingEventSupplier] = useState(null); // Store the whole object being edited
    const [editFormData, setEditFormData] = useState({ quoteAmount: '', status: '' });
    const [editFormError, setEditFormError] = useState('');
    // Bulk import modal (Option B — dual-write Supplier + EventSupplier from Excel/CSV)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isCommittedModalOpen, setIsCommittedModalOpen] = useState(false);
    const [bulkDeleteFeedback, setBulkDeleteFeedback] = useState(null);
    const addMenuRef = useRef(null);

    // Close the add-menu when clicking outside
    useEffect(() => {
        if (!isAddMenuOpen) return undefined;
        const handler = (e) => {
            if (addMenuRef.current && !addMenuRef.current.contains(e.target)) {
                setIsAddMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isAddMenuOpen]);

    // --- RTK Query Hooks ---
    // Using Enhanced query that includes Event and Supplier data nested
    const {
        data: eventSuppliersResponse,
        isLoading,
        isFetching,
        error,
    } = useListEventSuppliersByEventEnhancedQuery({ eventId }, {
        skip: !eventId, // Don't run query if eventId is not available
    });

    // Extract items from enhanced response
    const eventSuppliersData = useMemo(() => eventSuppliersResponse?.items || [], [eventSuppliersResponse]);
    const supplierLimit = authzLimit('suppliers', eventSuppliersData.length);
    const addBlocked = supplierLimit.reached || !writable;
    const addBlockedTitle = writeBlockedTitle(t, {
        writable,
        reason: accessReason,
        limitReached: supplierLimit.reached,
        limitMessage: t('eventSupplierList.limitReached', { max: supplierLimit.max }),
    });

    // List filters. They combine, and each one shows its totals under the
    // others: status totals sum the selected category, category totals sum the
    // selected status. E.g. Catering + Approved = approved catering total.
    const [filterStatus, setFilterStatus] = useState(null);
    const [filterCategory, setFilterCategory] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const categoryLabel = useCallback(
        (category) => (category === NO_CATEGORY
            ? t('eventSupplierList.categoryFilter.none', 'Sem categoria')
            : t(`supplier:categories.${category}`, category)),
        [t],
    );

    // Status summary bar (within the selected category)
    const { statusCounts, committedTotal, summarySuppliers } = useMemo(() => {
        const inCategory = filterEventSuppliers(eventSuppliersData, { category: filterCategory, search: searchTerm });
        const { counts, totalsByStatus, committed } = summarizeEventSupplierTotals(inCategory, eventCurrency);

        const statusDefs = [
            { status: 'PENDING',  colorClass: 'bg-warning-500', labelKey: 'eventSupplierList.status.pending' },
            { status: 'COUNTING_ON', colorClass: 'bg-secondary-500', labelKey: 'eventSupplierList.status.counting_on' },
            { status: 'APPROVED', colorClass: 'bg-primary-500',  labelKey: 'eventSupplierList.status.approved' },
            { status: 'PAID',     colorClass: 'bg-success-500',  labelKey: 'eventSupplierList.status.paid' },
            { status: 'REJECTED', colorClass: 'bg-error-500',    labelKey: 'eventSupplierList.status.rejected' },
        ];

        return {
            statusCounts: statusDefs.map(def => ({
                ...def,
                count: counts[def.status],
                total: formatCurrencyEntries(totalsByStatus[def.status]),
                label: t(def.labelKey, def.status),
            })),
            committedTotal: formatCurrencyEntries(committed),
            // Same scope as the bar, so the breakdown modal adds up to committedTotal
            summarySuppliers: inCategory,
        };
    }, [eventSuppliersData, eventCurrency, filterCategory, searchTerm, t]);

    // Category options (within the selected status), each with its count
    const categoryTotals = useMemo(
        () => summarizeByCategory(
            filterEventSuppliers(eventSuppliersData, { status: filterStatus, search: searchTerm }),
            eventCurrency,
        ).map(({ category, count }) => ({
            category,
            count,
            label: categoryLabel(category),
        })),
        [eventSuppliersData, eventCurrency, filterStatus, searchTerm, categoryLabel],
    );

    // The approval queue always counts every pending supplier, whatever the filters
    const pendingCount = useMemo(
        () => eventSuppliersData.filter((es) => es.status === 'PENDING').length,
        [eventSuppliersData],
    );

    const filteredEventSuppliers = useMemo(
        () => {
            const base = filterEventSuppliers(eventSuppliersData, {
                status: filterStatus,
                category: filterCategory,
                search: searchTerm,
            });
            // Newest first so a just-added association shows up at the top of the
            // list — there's no explicit sort control here and the DynamoDB GSI
            // order is not guaranteed. Fallback to id if createdAt is missing so
            // we stay stable-ish instead of leaving items in arbitrary order.
            return [...base].sort((a, b) => {
                const aKey = a.createdAt || a.id || '';
                const bKey = b.createdAt || b.id || '';
                if (aKey === bKey) return 0;
                return aKey < bKey ? 1 : -1;
            });
        },
        [eventSuppliersData, filterStatus, filterCategory, searchTerm],
    );

    // Total of what is on screen, shown while a filter is active
    const filteredTotal = useMemo(
        () => formatCurrencyEntries(summarizeEventSupplierTotals(filteredEventSuppliers, eventCurrency).total),
        [filteredEventSuppliers, eventCurrency],
    );

    const toggleStatusFilter = (status) => setFilterStatus(prev => (prev === status ? null : status));
    const clearFilters = () => {
        setFilterStatus(null);
        setFilterCategory(null);
        setSearchTerm('');
    };
    const hasActiveFilters = Boolean(filterStatus || filterCategory || searchTerm.trim());

    // Select needs a real value for "all"; it maps back to null
    const ALL = '__ALL__';
    const optionLabel = (label, count) => `${label} (${count})`;
    const categoryOptions = [
        { value: ALL, label: t('filters.category.all', 'Todas as Categorias') },
        ...categoryTotals.map(({ category, count, label }) => ({
            value: category,
            label: optionLabel(label, count),
        })),
    ];
    const statusOptions = [
        { value: ALL, label: t('eventSupplierList.statusFilter.all', 'Todos os estados') },
        ...statusCounts.map(({ status, count, label }) => ({
            value: status,
            label: optionLabel(label, count),
        })),
    ];

    const showSelectionColumn = canDelete;
    const {
        selectedIds,
        selectedCount,
        isSelected: isTableSelected,
        toggle,
        toggleAll,
        clear,
        allSelected,
        someSelected,
    } = useTableSelection(filteredEventSuppliers);

    const handleFilterPending = () => toggleStatusFilter('PENDING');

    const [removeEventSupplier, { isLoading: isRemoving }] = useRemoveEventSupplierMutation();
    // Add Update Mutation Hook
    const [updateEventSupplier, { isLoading: isUpdatingAssociation }] = useUpdateEventSupplierMutation();
    // Add hooks for new mutations
    const [revertApproval, { isLoading: isReverting }] = useRevertEventSupplierApprovalMutation();
    const [adjustQuote, { isLoading: isAdjusting }] = useAdjustApprovedEventSupplierQuoteMutation();

    // Combined loading state for edit modal save button
    const isSavingEdit = isUpdatingAssociation || isReverting || isAdjusting;

    // Get supplier name for Step 2 Header (memoize if needed)
    // Get own suppliers via RTK Query
    const { data: ownSuppliersData, isLoading: isLoadingOwn } = useListSuppliersQuery();
    const ownSuppliers = useMemo(() => ownSuppliersData?.items || [], [ownSuppliersData]);

    // Extract shared suppliers from the event suppliers response
    const sharedSuppliers = useMemo(() => eventSuppliersResponse?.sharedSuppliers || [], [eventSuppliersResponse]);

    // Merge own + shared suppliers (deduplicated)
    const mergedSuppliers = useMemo(() => {
        if (sharedSuppliers.length === 0) return ownSuppliers;

        const supplierMap = new Map();
        ownSuppliers.forEach(s => supplierMap.set(s.id, s));
        sharedSuppliers.forEach(s => {
            if (!supplierMap.has(s.id)) supplierMap.set(s.id, s);
        });
        return [...supplierMap.values()];
    }, [ownSuppliers, sharedSuppliers]);

    // Extract unique categories from merged suppliers
    const existingCategories = React.useMemo(() => {
        const categories = mergedSuppliers.map(supplier => supplier.category).filter(Boolean);
        return [...new Set(categories)];
    }, [mergedSuppliers]);

    // --- Event Handlers ---
    // Handler to show Supplier Details Modal
    const handleShowSupplierDetailModal = (supplierId) => {
        setSelectedSupplierIdForDetail(supplierId);
        setIsSupplierDetailModalOpen(true);
    };

    // Handler to close Supplier Details Modal
    const handleCloseSupplierDetailModal = () => {
        setIsSupplierDetailModalOpen(false);
        setSelectedSupplierIdForDetail(null);
    };

     // Handler for Delete Association confirmation request
     const handleDeleteClick = (eventSupplierId) => {
        setShowDeleteConfirm(eventSupplierId);
    };

    // Handler for confirming Delete Association
    const handleConfirmDelete = async () => {
        if (!showDeleteConfirm) return;
        const eventSupplierIdToDelete = showDeleteConfirm; // Guardar o ID
        try {
            // Usar a nova mutação e passar o argumento correto
            const result = await removeEventSupplier({ eventSupplierId: eventSupplierIdToDelete }).unwrap();
            console.log('Removal result:', result); // Logar a mensagem de sucesso do backend
            if (selectedIds.includes(eventSupplierIdToDelete)) {
                toggle(eventSupplierIdToDelete);
            }
            setShowDeleteConfirm(null); // Fechar modal no sucesso
            // Adicionar notificação de sucesso usando result.message
        } catch (err) {
             console.error("Failed to remove event supplier association:", err);
             setShowDeleteConfirm(null); // Fechar modal no erro também
             // Adicionar notificação de erro usando err.data?.message ou err.message
        }
    };

    const handleBulkDelete = async (confirmed) => {
        if (!confirmed) {
            setIsBulkDeleteAlertOpen(false);
            return;
        }

        const idsToDelete = [...selectedIds];
        if (!idsToDelete.length) {
            setIsBulkDeleteAlertOpen(false);
            return;
        }

        setIsBulkDeleting(true);

        try {
            const results = await Promise.allSettled(
                idsToDelete.map((eventSupplierId) => removeEventSupplier({ eventSupplierId }).unwrap())
            );

            const deletedIds = idsToDelete.filter((_, index) => results[index].status === 'fulfilled');
            const failedCount = results.length - deletedIds.length;

            clear();
            setIsBulkDeleteAlertOpen(false);

            if (failedCount > 0) {
                setBulkDeleteFeedback({
                    title: t('eventSupplierList.actions.bulkDeleteErrorTitle', 'Não foi possível concluir a remoção'),
                    message: t('eventSupplierList.errors.bulkDeleteFailed', { count: failedCount }),
                });
            }
        } catch (err) {
            console.error('Failed to bulk remove event supplier associations:', err);
            clear();
            setIsBulkDeleteAlertOpen(false);
            setBulkDeleteFeedback({
                title: t('eventSupplierList.actions.bulkDeleteErrorTitle', 'Não foi possível concluir a remoção'),
                message: t('eventSupplierList.errors.bulkDeleteFailed', { count: idsToDelete.length }),
            });
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // Handlers for Edit Modal
    const handleOpenEditModal = (eventSupplierToEdit) => {
        setEditingEventSupplier(eventSupplierToEdit);
        setEditFormData({
            quoteAmount: eventSupplierToEdit.quoteAmount?.toString() || '',
            // APPROVED: start empty so Select shows placeholder (no redundant "Approved" option)
            status: eventSupplierToEdit.status === 'APPROVED' ? '' : (eventSupplierToEdit.status || 'PENDING'),
        });
        setEditFormError(''); // Clear previous errors
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingEventSupplier(null);
        setEditFormData({ quoteAmount: '', status: '' });
        setEditFormError('');
    };

    // Simplified handler - validation happens on save
    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
        // Clear error instantly when user types in the problematic field
        if (editFormError && (name === 'quoteAmount' || name === 'status')) { 
            setEditFormError('');
        }
    };
    
    const handleEditStatusChange = (e) => {
        setEditFormData(prev => ({ ...prev, status: e.target.value }));
        // Clear error instantly when user selects a status
        if (editFormError) { 
            setEditFormError('');
        }
    };

    const handleSaveChanges = async () => {
        if (!editingEventSupplier) return;
        setEditFormError('');
        
        const originalStatus = editingEventSupplier.status;
        const originalQuote = editingEventSupplier.quoteAmount;
        // Empty string means user didn't change the status (APPROVED case with no option pre-selected)
        const newStatus = editFormData.status || originalStatus;
        const newQuoteString = editFormData.quoteAmount.trim();
        const newQuote = newQuoteString === '' ? null : parseFloat(newQuoteString);

        // --- Validation --- 
        if (newQuoteString !== '' && (isNaN(newQuote) || newQuote < 0)) {
            setEditFormError(t('eventSupplierList.editErrors.invalidQuote', 'Invalid quote amount.'));
            return;
        }
        if (!newStatus) {
            setEditFormError(t('eventSupplierList.editErrors.statusRequired', 'Status is required.'));
            return;
        }

        // --- Determine Action based on Changes --- 
        const statusChanged = originalStatus !== newStatus;
        const quoteChanged = originalQuote !== newQuote && !(originalQuote === null && newQuote === null) && !(isNaN(originalQuote) && isNaN(newQuote)); // Handle null/NaN carefully

        console.log("Original Status:", originalStatus, "New Status:", newStatus);
        console.log("Original Quote:", originalQuote, "New Quote:", newQuote);
        console.log("Status Changed:", statusChanged, "Quote Changed:", quoteChanged);

        try {
            // Scenario 1: Reverting Approval (APPROVED -> PENDING/COUNTING_ON/REJECTED)
            if (originalStatus === 'APPROVED' && NON_COMMITTED_STATUSES.includes(newStatus)) {
                console.log("Calling revertEventSupplierApproval...");
                await revertApproval({ 
                    eventSupplierId: editingEventSupplier.id, 
                    newStatus: newStatus 
                }).unwrap();
            }
            // Scenario 2: Adjusting Quote of an Approved Supplier (Status remains APPROVED)
            else if (originalStatus === 'APPROVED' && newStatus === 'APPROVED' && quoteChanged) {
                console.log("Calling adjustApprovedEventSupplierQuote...");
                // Validate newQuote is not null for adjustment
                if (newQuote === null) {
                     throw new Error(t('eventSupplierList.editErrors.quoteCannotBeNullForApproved', 'Quote amount cannot be removed for an approved supplier. Please provide a valid amount.'));
                }
                await adjustQuote({ 
                    eventSupplierId: editingEventSupplier.id, 
                    newQuoteAmount: newQuote 
                }).unwrap();
            }
             // Scenario 3: Standard Update (Any other allowed change, e.g., PENDING -> REJECTED, adding quote to PENDING)
             else if (statusChanged || quoteChanged) { // Check if *any* change was made that isn't handled above
                // Prevent changing *to* APPROVED or PAID via standard update if it wasn't already handled
                if ((newStatus === 'APPROVED' || newStatus === 'PAID') && originalStatus !== newStatus) {
                    throw new Error(t('eventSupplierList.editErrors.approvalPaymentWorkflow', 'Approval and Payment must follow their specific workflow actions.'));
                }
                console.log("Calling updateEventSupplier (Standard)...");
                await updateEventSupplier({
                    id: editingEventSupplier.id,
                    status: newStatus,
                    quoteAmount: newQuote,
                }).unwrap();
            }
            // Scenario 4: No relevant changes detected
            else {
                console.log("No changes detected requiring save.");
                // Optionally show a message or just close
            }

            handleCloseEditModal(); // Close modal on success for all scenarios

        } catch (err) {
            console.error("Failed to save event supplier changes:", err);
            const gateReason = billingGateReasonFromError(err);
            const errorMsg = gateReason
                ? t(`common:${billingGateMessageKey(gateReason)}`)
                : err?.data?.message || err?.message || t('common:errors.generic', 'Failed to save changes.');
            setEditFormError(errorMsg);
        }
    };
    
     // --- Helper for Select Options --- 
     const getTranslatedStatusOptions = () => STATUS_OPTIONS.map(opt => ({ 
         ...opt, 
         label: t(opt.labelKey, opt.value) 
     }));

    // --- Render Logic ---

    const renderContent = () => {
        if (!eventId) {
             return <div className="p-4 text-center text-text-light">{t('eventSupplierList.noEventSelected', 'No event selected.')}</div>;
        }
        if (isLoading) {
            return <Skeleton variant="eventSupplierList" isLoading={true} />;
        }
        if (error) {
            return <div className="p-4 text-center text-error">{t('eventSupplierList.errorLoading', 'Error loading suppliers for this event.')}</div>;
        }
        if (!eventSuppliersData || eventSuppliersData.length === 0) {
            return <div className="p-6 text-center text-text-light">{t('eventSupplierList.noSuppliers', 'No suppliers associated with this event yet.')}</div>;
        }

        if (!filteredEventSuppliers.length) {
            return <div className="p-6 text-center text-text-light">{t('eventSupplierList.noSuppliersFound', 'No suppliers match the current filter.')}</div>;
        }

        // --- Render Custom List --- 
        return (
            <div className="overflow-x-auto">
                {/* List Header - Mimicking SupplierList */}
                <div className="bg-background-100 dark:bg-background-800/50 border-b border-background-200 dark:border-background-700">
                    <div className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold tracking-wider uppercase text-muted-foreground min-w-[760px]">
                        {showSelectionColumn && (
                            <div className="w-11 flex-shrink-0" onClick={(event) => event.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    onChange={toggleAll}
                                    checked={allSelected}
                                    ref={(input) => {
                                        if (input) input.indeterminate = someSelected;
                                    }}
                                    aria-label={t('eventSupplierList.table.selection.selectAll')}
                                    className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500 cursor-pointer accent-primary-500"
                                />
                            </div>
                        )}
                        {/* Supplier Name */}
                        <div className="flex-1 min-w-0 pr-2 font-semibold">{t('eventSupplierList.headers.supplier', 'Supplier')}</div>
                        {/* Category (New Column) */}
                        <div className="hidden lg:flex w-[120px] flex-shrink-0 pr-2">{t('list.table.headers.category', 'Category')}</div> 
                        {/* Quote Amount */}
                        <div className="hidden md:flex w-[140px] flex-shrink-0 pr-2">{t('eventSupplierList.headers.quote', 'Quote')}</div>
                        {/* Status */}
                        <div className="hidden md:flex w-[130px] flex-shrink-0 pr-2">{t('eventSupplierList.headers.status', 'Status')}</div>
                        {/* Actions */}
                        <div className="w-[50px] flex-shrink-0 text-center">{t('eventSupplierList.headers.actions', 'Actions')}</div>
                    </div>
                </div>
                {/* List Items */}
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                    {filteredEventSuppliers.map((es) => (
                        <EventSupplierListItem
                            key={es.id}
                            eventSupplier={es}
                            onShowSupplierDetails={handleShowSupplierDetailModal}
                            onDelete={canDelete ? handleDeleteClick : undefined}
                            onEditAssociation={canEdit ? handleOpenEditModal : undefined}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            canApprove={canApprove}
                            isSelected={showSelectionColumn ? isTableSelected(es.id) : false}
                            showSelectionCheckbox={showSelectionColumn}
                            onToggleSelection={toggle}
                            eventCurrency={eventCurrency}
                        />
                    ))}
                </div>
            </div>
        );
    };

    // Detail panel opens at 85% of the viewport by default; the resize
    // handle then lets the user adjust it to whatever size they want.
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1600;
    const supplierDetailDefaultWidth = Math.round(viewportWidth * 0.85);
    const supplierDetailMaxWidth = Math.round(viewportWidth * 0.98);

    // --- Main Component Return ---
    // Using Card as an example container. Adjust as needed based on where it's placed.
    return (
         <Card padded="none">
            <div className="flex justify-between items-center p-4 border-b border-neutral-200/60 dark:border-neutral-800/60">
                 <Text variant="h6" weight="medium">{t('eventSupplierList.title', 'Associated Suppliers')}</Text>
                 {/* Only show Add button if user can manage suppliers */}
                 {canAdd && (
                    <div className="relative" ref={addMenuRef}>
                        <div className="flex items-stretch">
                            <Button
                                id="fab-action-suppliers"
                                variant="primary"
                                size="sm"
                                disabled={addBlocked}
                                title={addBlockedTitle}
                                onClick={() => setIsAddPanelOpen(true)}
                                className="rounded-r-none"
                            >
                                <span className="flex items-center">
                                    <FiPlus className="text-sm mr-1.5" />
                                    {t('eventSupplierList.addAssociation', 'Add Supplier')}
                                    {Number.isFinite(supplierLimit.max) && (
                                        <span className="ml-1.5 text-[11px] opacity-80">
                                            {eventSuppliersData.length}/{supplierLimit.max}
                                        </span>
                                    )}
                                </span>
                            </Button>
                            <button
                                type="button"
                                aria-label={t('eventSupplierList.addMenu.aria', 'More add options')}
                                aria-haspopup="menu"
                                aria-expanded={isAddMenuOpen}
                                // O menu só tem escritas (import) — mesmo bloqueio do Add
                                disabled={addBlocked}
                                title={addBlockedTitle}
                                onClick={() => setIsAddMenuOpen((v) => !v)}
                                className="px-2 bg-primary-500 hover:bg-primary-600 text-white rounded-r-md border-l border-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500"
                            >
                                <FiChevronDown className="text-sm" />
                            </button>
                        </div>
                        {isAddMenuOpen && (
                            <div
                                role="menu"
                                className="absolute right-0 mt-1 z-20 min-w-[220px] rounded-md shadow-lg bg-popover border border-border"
                            >
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="flex items-start gap-2.5 w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                                    onClick={() => {
                                        setIsAddMenuOpen(false);
                                        setIsImportModalOpen(true);
                                    }}
                                >
                                    <FiUpload className="mt-0.5 text-primary-600 dark:text-primary-400" />
                                    <span className="flex flex-col">
                                        <span className="text-sm font-medium">
                                            {t('eventSupplierList.addMenu.importFromFile', 'Import from file')}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {t('eventSupplierList.addMenu.importHint', '.xlsx / .csv — creates suppliers + links')}
                                        </span>
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                 )}
             </div>

             {/* Approval Queue Banner */}
             {canApprove && pendingCount > 0 && (
                <div
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3
                               border-b border-warning-200 dark:border-warning-800/50
                               bg-warning-50 dark:bg-warning-900/20"
                    role="alert"
                    aria-live="polite"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <FiAlertTriangle
                            className="w-4 h-4 text-warning-600 dark:text-warning-400 flex-shrink-0"
                            aria-hidden="true"
                        />
                        <Text variant="body2" className="text-warning-800 dark:text-warning-200 font-medium" as="p">
                            {t('eventSupplierList.approvalBanner.message', {
                                count: pendingCount,
                                defaultValue: '{{count}} fornecedor(es) aguarda(m) a sua aprovação'
                            })}
                        </Text>
                    </div>
                    <Button
                        variant={filterStatus === 'PENDING' ? 'soft' : 'warning'}
                        size="sm"
                        onClick={handleFilterPending}
                    >
                        {filterStatus === 'PENDING'
                            ? t('eventSupplierList.approvalBanner.showAll', 'Mostrar todos')
                            : t('eventSupplierList.approvalBanner.action', 'Ver pendentes')
                        }
                    </Button>
                </div>
             )}

             {/* Summary Bar */}
             {eventSuppliersData.length > 0 && (
                <div
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5
                               border-b border-background-200 dark:border-background-700
                               bg-background-50 dark:bg-background-800/30"
                    role="status"
                    aria-label={t('eventSupplierList.summary.ariaLabel', 'Resumo do estado dos fornecedores')}
                >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        {statusCounts.map(({ status, count, total, colorClass, label }) => (
                            count > 0 && (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => toggleStatusFilter(status)}
                                    aria-pressed={filterStatus === status}
                                    title={t('eventSupplierList.summary.filterByStatus', 'Filtrar por este estado')}
                                    className={`inline-flex items-center gap-1.5 -mx-1.5 px-1.5 py-0.5 rounded-md text-sm text-muted-foreground transition-colors
                                               hover:bg-background-100 dark:hover:bg-background-700/60
                                               focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${
                                        filterStatus === status ? 'bg-background-100 dark:bg-background-700/60 ring-1 ring-primary-500' : ''
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${colorClass} flex-shrink-0`} aria-hidden="true" />
                                    <span className="font-medium text-text-700 dark:text-text-200">{count}</span>
                                    <span>{label}</span>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-medium text-text-700 dark:text-text-200 tabular-nums">{total}</span>
                                </button>
                            )
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCommittedModalOpen(true)}
                        aria-haspopup="dialog"
                        title={t('eventSupplierList.summary.viewByCategory', 'Ver por categoria')}
                        className="inline-flex items-center gap-1.5 -mx-1.5 px-1.5 py-0.5 rounded-md text-sm transition-colors
                                   hover:bg-background-100 dark:hover:bg-background-700/60
                                   focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
                    >
                        <FiPieChart className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 flex-shrink-0" aria-hidden="true" />
                        <span className="text-muted-foreground">
                            {t('eventSupplierList.summary.totalCommitted', 'Total comprometido')}:
                        </span>
                        <span className="font-semibold text-text-800 dark:text-text-100 tabular-nums">
                            {committedTotal}
                        </span>
                    </button>
                </div>
             )}

             {/* Filters: search, category and status, each option with its count */}
             {eventSuppliersData.length > 0 && (
                <div
                    className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3 border-b border-background-200 dark:border-background-700"
                    role="search"
                    aria-label={t('eventSupplierList.filtersAriaLabel', 'Filtrar fornecedores')}
                >
                    <Input
                        type="text"
                        name="eventSupplierSearch"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('filters.search.placeholder', 'Pesquisar fornecedores...')}
                        aria-label={t('filters.search.label', 'Pesquisar fornecedores')}
                        startIcon={<FiSearch className="text-text-400" />}
                        size="sm"
                        fullWidth
                    />
                    <Select
                        name="eventSupplierCategory"
                        options={categoryOptions}
                        value={filterCategory || ALL}
                        onChange={(e) => setFilterCategory(e.target.value === ALL ? null : e.target.value)}
                        startIcon={<FiFilter className="text-text-400" />}
                        search={categoryTotals.length > 6}
                        size="sm"
                        aria-label={t('filters.category.label', 'Categoria')}
                    />
                    <Select
                        name="eventSupplierStatus"
                        options={statusOptions}
                        value={filterStatus || ALL}
                        onChange={(e) => setFilterStatus(e.target.value === ALL ? null : e.target.value)}
                        size="sm"
                        aria-label={t('eventSupplierList.headers.status', 'Estado')}
                    />
                </div>
             )}

             {/* Active filter indicator with the total of what is shown */}
             {hasActiveFilters && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800/50">
                    <Text variant="caption" className="text-primary-700 dark:text-primary-300 font-medium">
                        {t('eventSupplierList.filter.active', {
                            status: [
                                searchTerm.trim() && `“${searchTerm.trim()}”`,
                                filterCategory && categoryLabel(filterCategory),
                                filterStatus && t(`eventSupplierList.status.${filterStatus.toLowerCase()}`),
                            ].filter(Boolean).join(' · '),
                            defaultValue: 'A mostrar: {{status}}'
                        })}
                        <span className="mx-1.5" aria-hidden="true">—</span>
                        {t('eventSupplierList.filter.total', 'Total')}:{' '}
                        <span className="font-semibold tabular-nums">{filteredTotal}</span>
                    </Text>
                    <button
                        onClick={clearFilters}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200
                                   font-medium underline underline-offset-2 transition-colors duration-150
                                   focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 rounded"
                        aria-label={t('eventSupplierList.filter.clearAriaLabel', 'Limpar filtros')}
                    >
                        {t('eventSupplierList.filter.clear', 'Mostrar todos')}
                    </button>
                </div>
             )}

             {eventSuppliersData.length > 0 && (
                <div className="px-4 py-3 border-b border-neutral-200/60 dark:border-neutral-800/60 bg-card">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <Text variant="body2" className="text-muted-foreground">
                                {t('eventSupplierList.table.summary.filteredCount', { count: filteredEventSuppliers.length })}
                            </Text>
                            {showSelectionColumn && selectedCount > 0 && (
                                <Badge variant="primary" tone="soft" size="sm" pill>
                                    {t('eventSupplierList.table.summary.selectedCount', { count: selectedCount })}
                                </Badge>
                            )}
                        </div>

                        {showSelectionColumn && selectedCount > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <Button variant="ghost" size="sm" onClick={clear}>
                                    {t('eventSupplierList.table.selection.clear')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsBulkDeleteAlertOpen(true)}
                                    icon={<FiTrash2 className="h-4 w-4 text-error-500" />}
                                >
                                    {t('eventSupplierList.actions.deleteSelected', { count: selectedCount })}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
             )}

             <div className="p-0">
                <div className="relative">
                    {isFetching && !isLoading && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 animate-pulse"></div>
                    )}
                    {renderContent()}
                 </div>
             </div>

             {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <AlertPopup
                    title={t('eventSupplierList.deleteConfirm.title', 'Remove Association')}
                    message={t('eventSupplierList.deleteConfirm.message', 'Are you sure you want to remove this supplier from the event? This action might revert committed expenses if the supplier was approved.')}
                    confirmText={t('eventSupplierList.deleteConfirm.confirmButton', 'Remove')}
                    cancelText={t('common:actions.cancel', 'Cancel')}
                    onClose={(confirmed) => {
                        if (confirmed) {
                            handleConfirmDelete();
                        } else {
                            setShowDeleteConfirm(null);
                        }
                    }}
                    isDeleting={isRemoving}
                    confirmColor="error"
                    isConfirmation={true}
                />
            )}

            {isBulkDeleteAlertOpen && (
                <AlertPopup
                    title={t('eventSupplierList.actions.bulkDeleteTitle')}
                    message={t('eventSupplierList.actions.bulkDeleteMessage', { count: selectedCount })}
                    isConfirmation={true}
                    confirmText={t('common:actions.delete')}
                    cancelText={t('common:actions.cancel')}
                    onClose={handleBulkDelete}
                    isDeleting={isBulkDeleting}
                    confirmColor="error"
                />
            )}

            {bulkDeleteFeedback && (
                <AlertPopup
                    title={bulkDeleteFeedback.title}
                    message={bulkDeleteFeedback.message}
                    onClose={() => setBulkDeleteFeedback(null)}
                    confirmText={t('common:alert.ok')}
                />
            )}

            {/* Add Supplier side panel (replaces previous Select Supplier modal) */}
            <AddSupplierPanel
                isOpen={isAddPanelOpen}
                onClose={() => setIsAddPanelOpen(false)}
                eventId={eventId}
                suppliers={mergedSuppliers}
                existingCategories={existingCategories}
                isLoadingSuppliers={isLoadingOwn}
                canManageSuppliers={canManageSuppliers}
                canSelectSupplier={canSelectSupplier}
            />

            {/* Edit Association Modal */}
            {editingEventSupplier && (
                <Modal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    size="xl"
                    fullWidth
                >
                    <Modal.Header className="px-6 pt-5 pb-4">
                        <div className="space-y-0.5">
                            <div className="text-base font-semibold text-foreground">
                                {t('eventSupplierList.editModal.title', 'Edit Association Details')}
                            </div>
                            {editingEventSupplier.supplier?.name && (
                                <div className="text-xs text-muted-foreground truncate">
                                    {editingEventSupplier.supplier.name}
                                </div>
                            )}
                        </div>
                    </Modal.Header>
                    {/* Tall enough for the status dropdown to open without scrolling the body */}
                    <Modal.Body className="px-6 py-5 overflow-visible min-h-[400px]">
                        <div className="space-y-5">
                            <div>
                                <Input
                                    label={t('eventSupplierList.selectModal.quoteLabel', 'Quote Amount')}
                                    id="editQuoteAmount"
                                    name="quoteAmount"
                                    type="number"
                                    placeholder="0,00"
                                    startIcon={<span className="text-sm font-medium">€</span>}
                                    value={editFormData.quoteAmount}
                                    onChange={handleEditFormChange}
                                    step="0.01"
                                    min="0"
                                    disabled={isSavingEdit}
                                    className="w-full"
                                />
                                {NON_COMMITTED_STATUSES.includes(editingEventSupplier?.status) && (
                                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                                        {t('eventSupplierList.editModal.quoteInfoPendingRejected', '(This amount is informational and only impacts the budget upon approval)')}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Text variant="label" className="mb-1.5 block">{t('eventSupplierList.headers.status')}</Text>
                                <Select
                                    options={getTranslatedStatusOptions().filter(opt => {
                                        const s = editingEventSupplier?.status;
                                        if (s === 'PAID') return opt.value === 'PAID';
                                        if (s === 'APPROVED' || NON_COMMITTED_STATUSES.includes(s)) {
                                            return NON_COMMITTED_STATUSES.includes(opt.value);
                                        }
                                        return true;
                                    })}
                                    value={editFormData.status}
                                    onChange={handleEditStatusChange}
                                    name="status"
                                    className="w-full"
                                    disabled={isSavingEdit}
                                    placeholder={t('eventSupplierList.editModal.statusPlaceholder', 'Alterar estado...')}
                                />
                                {editingEventSupplier?.status === 'APPROVED' && (
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        {t('eventSupplierList.editModal.approvedStatusHint', 'O fornecedor está aprovado. Seleciona um novo estado para reverter, ou deixa em branco para manter.')}
                                    </p>
                                )}
                            </div>

                            {editFormError && (
                                <p className="text-xs text-error-600 dark:text-error-400">
                                    {editFormError}
                                </p>
                            )}
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="outline" onClick={handleCloseEditModal}>
                            {t('common:actions.cancel', 'Cancel')}
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSaveChanges}
                            loading={isSavingEdit}
                            disabled={isSavingEdit}
                        >
                            {t('common:actions.save')}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}

            <DetailPanelShell
                isOpen={isSupplierDetailModalOpen}
                onClose={handleCloseSupplierDetailModal}
                ariaLabel={t('details.panelAriaLabel', t('details.title'))}
                resizable
                defaultWidth={supplierDetailDefaultWidth}
                minWidth={480}
                maxWidth={supplierDetailMaxWidth}
                storageKey="supplierDetailPanelWidth"
            >
                <div className="p-4 sm:p-6">
                    {selectedSupplierIdForDetail ? (
                        <SupplierDetailContent supplierId={selectedSupplierIdForDetail} eventId={eventId} />
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            {t('details.selectPrompt', 'Select a supplier to view details.')}
                        </div>
                    )}
                </div>
            </DetailPanelShell>

            {/* Bulk import modal (Option B — dual-write) */}
            {canAdd && (
                <ImportEventSuppliersModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    eventId={eventId}
                    eventCurrency={eventCurrency}
                />
            )}

            <CommittedByCategoryModal
                isOpen={isCommittedModalOpen}
                onClose={() => setIsCommittedModalOpen(false)}
                eventSuppliers={summarySuppliers}
                eventCurrency={eventCurrency}
                categoryLabel={categoryLabel}
            />

         </Card>
     );
 };

 // Update PropTypes
 EventSupplierList.propTypes = {
     eventId: PropTypes.string.isRequired,
     eventCurrency: PropTypes.string,
     canManageSuppliers: PropTypes.bool,
     canEditSuppliers: PropTypes.bool,
     canDeleteSuppliers: PropTypes.bool,
     canSelectSupplier: PropTypes.bool,
     canApproveSuppliers: PropTypes.bool,
 };

 export default EventSupplierList;
