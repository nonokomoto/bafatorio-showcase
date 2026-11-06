import { useState, useMemo, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiUpload } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
// Import Redux hooks and actions
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentPage } from '../../Redux/Suppliers/supplierControlsSlice';


// Import Import Modal
import ImportSuppliersModal from './ImportSupplierModal';
import SupplierDetailContent from './SupplierDetailContent';
// Import Extracted List Item Component
import SupplierListItem from './SupplierListItem';
// Import Controls and Pagination
import SupplierControls from './SupplierControls';
import SupplierPagination from './SupplierPagination';
import NoSuppliers from './NoSuppliers';
// Import UI Components
import { Card, Button, Text, Skeleton } from '../UI/index.js';
import AlertPopup from '../Layout/AlertPopUp';
import DetailPanelShell from '../UI/DetailPanelShell';

// Import API Hooks
// Remove delete mutation import if only used in Item
import { useDeleteSupplierMutation, useGetSupplierQuery, useListSuppliersQuery } from '../../Api/services/supplierApi';
import { useTableSelection } from '../../Hook/useTableSelection';

// Add PropTypes
import PropTypes from 'prop-types';

const SupplierList = ({
    isSelectionMode = false, // New prop
    selectedSupplierId: externalSelectedId, // New prop, renamed to avoid conflict
    onSupplierSelect, // New prop
    suppliers: externalSuppliers,       // Optional external supplier data
    isLoadingExternal = false,          // Loading state for external data
    errorExternal = null,               // Error state for external data
}) => {
    const { t } = useTranslation(['supplier', 'common']);
    const navigate = useNavigate();
    // Get data from API (skip if external data is provided)
    const { data: apiData, isLoading: isLoadingOwn, error: errorOwn } = useListSuppliersQuery(
        undefined,
        { skip: !!externalSuppliers }
    );
    const [deleteSupplier, { isLoading: isDeletingSelected }] = useDeleteSupplierMutation();
    const effectiveData = useMemo(
        () => (externalSuppliers ? { items: externalSuppliers } : apiData),
        [externalSuppliers, apiData]
    );
    const isLoading = externalSuppliers ? isLoadingExternal : isLoadingOwn;
    const error = externalSuppliers ? errorExternal : errorOwn;
    // Get control state from Redux
    const { searchQuery, filterCategory, sortCriterion, currentPage, itemsPerPage } = useSelector(state => state.supplierControls);
    // Removed user selector as it wasn't used in HeaderWithButton example

    // State for detail modal (only relevant if not in selection mode)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplierIdInternal, setSelectedSupplierIdInternal] = useState(null);
    // Delete confirmation for the supplier open in the detail modal
    const [isDeleteSelectedConfirmOpen, setIsDeleteSelectedConfirmOpen] = useState(false);
    const [deleteSelectedError, setDeleteSelectedError] = useState(null); // { title, message }

    // Reuses the same RTK Query cache entry SupplierDetailContent subscribes
    // to (no extra network request), just to get the name for the confirm dialog.
    const { data: selectedSupplierData } = useGetSupplierQuery(selectedSupplierIdInternal, {
        skip: !selectedSupplierIdInternal,
    });

    // ADDED: State for import modal
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [bulkDeleteFeedback, setBulkDeleteFeedback] = useState(null);

    // Remove state for delete confirmation dialog
    // const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    // const [supplierToDelete, setSupplierToDelete] = useState(null);

    // Handler to open the detail modal (disable in selection mode)
    const handleShowModal = (id) => {
        if (isSelectionMode) return;
        setSelectedSupplierIdInternal(id);
        setIsModalOpen(true);
    };

    // Handler to close the detail modal
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSupplierIdInternal(null);
    };

    const handleEditSelected = () => {
        if (!selectedSupplierIdInternal) return;
        navigate(`/app/suppliers/edit/${selectedSupplierIdInternal}`);
    };

    const handleDeleteSelectedClick = () => setIsDeleteSelectedConfirmOpen(true);

    const handleConfirmDeleteSelected = async (confirmed) => {
        if (!confirmed) {
            setIsDeleteSelectedConfirmOpen(false);
            return;
        }
        if (!selectedSupplierIdInternal) {
            setIsDeleteSelectedConfirmOpen(false);
            return;
        }
        try {
            await deleteSupplier(selectedSupplierIdInternal).unwrap();
            setIsDeleteSelectedConfirmOpen(false);
            handleCloseModal();
        } catch (err) {
            setIsDeleteSelectedConfirmOpen(false);
            if (err?.code === 'SUPPLIER_LINKED_TO_EVENTS') {
                setDeleteSelectedError({
                    title: t('list.errors.linkedToEventsTitle'),
                    message: t('list.errors.linkedToEvents', { count: err.eventCount ?? 1 }),
                });
            } else {
                setDeleteSelectedError({
                    title: t('list.errors.deleteFailedTitle'),
                    message: t('list.errors.deleteFailed'),
                });
            }
        }
    };

    // ADDED: Handlers for Import Modal
    const handleOpenImportModal = () => {
        setIsImportModalOpen(true);
    };

    const handleCloseImportModal = () => {
        setIsImportModalOpen(false);
    };

    // Remove Delete Handlers 
    // const requestDeleteSupplier = (supplierId) => { ... };
    // const closeDeleteDialog = () => { ... };
    // const confirmDeleteSupplier = async () => { ... };

    // Handler for item click in selection mode
    const handleItemClick = (supplierId) => {
        if (isSelectionMode && onSupplierSelect) {
            onSupplierSelect(supplierId);
        }
    };

    // Memoized filtering, sorting, and pagination logic (Client-side)
    const processedSuppliers = useMemo(() => {
        let suppliers = effectiveData?.items || [];

        // 1. Search Filter
        if (searchQuery) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            suppliers = suppliers.filter(s => 
                s.name?.toLowerCase().includes(lowerCaseQuery) ||
                s.contactEmail?.toLowerCase().includes(lowerCaseQuery) ||
                s.category?.toLowerCase().includes(lowerCaseQuery)
            );
        }

        // 2. Category Filter
        if (filterCategory !== 'all') {
            suppliers = suppliers.filter(s => s.category === filterCategory);
        }

        // 3. Sorting
        suppliers = [...suppliers].sort((a, b) => {
            switch (sortCriterion) {
                case 'nameAsc':
                    return (a.name || '').localeCompare(b.name || '');
                case 'nameDesc':
                    return (b.name || '').localeCompare(a.name || '');
                case 'dateAsc':
                    return new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt);
                case 'dateDesc':
                    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
                default:
                    return 0;
            }
        });

        // 4. Pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedItems = suppliers.slice(startIndex, startIndex + itemsPerPage);

        return { 
            filteredAndSortedSuppliers: suppliers, // For total count after filtering
            paginatedSuppliers: paginatedItems   // For rendering current page
        };
    }, [effectiveData, searchQuery, filterCategory, sortCriterion, currentPage, itemsPerPage]);

    const totalFilteredSuppliers = processedSuppliers.filteredAndSortedSuppliers.length;
    const displaySuppliers = processedSuppliers.paginatedSuppliers;

    const dispatch = useDispatch();
    // Clamp currentPage here in the parent, not in <SupplierPagination>: that control
    // unmounts when the list fits on a single page, so deleting the last row of a
    // later page would strand the user on an empty page with no control to click back.
    // Only the catalog owns the shared supplierControls.currentPage — skip in selection
    // mode (the AddSupplierPanel picker), whose smaller list would otherwise clamp and
    // reset the catalog's page. Mirrors the original !isSelectionMode gate on the control.
    useEffect(() => {
        if (isSelectionMode) return;
        const totalPages = Math.max(1, Math.ceil(totalFilteredSuppliers / itemsPerPage));
        if (currentPage > totalPages) {
            dispatch(setCurrentPage(totalPages));
        }
    }, [isSelectionMode, currentPage, itemsPerPage, totalFilteredSuppliers, dispatch]);
    const {
        selectedIds,
        selectedCount,
        isSelected: isTableSelected,
        toggle,
        toggleAll,
        clear,
        allSelected,
        someSelected,
    } = useTableSelection(displaySuppliers);
    
    // Extract unique categories for the filter dropdown
    const uniqueCategories = useMemo(() => {
        const allCats = (effectiveData?.items || []).map(s => s.category).filter(Boolean);
        return [...new Set(allCats)];
    }, [effectiveData]);

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
                idsToDelete.map((supplierId) => deleteSupplier(supplierId).unwrap())
            );

            const deletedIds = idsToDelete.filter((_, index) => results[index].status === 'fulfilled');
            const failedResults = results.filter((r) => r.status === 'rejected');
            const linkedCount = failedResults.filter((r) => r.reason?.code === 'SUPPLIER_LINKED_TO_EVENTS').length;
            const otherFailCount = failedResults.length - linkedCount;

            if (selectedSupplierIdInternal && deletedIds.includes(selectedSupplierIdInternal)) {
                handleCloseModal();
            }

            clear();
            setIsBulkDeleteAlertOpen(false);

            if (failedResults.length > 0) {
                if (linkedCount > 0 && otherFailCount === 0) {
                    setBulkDeleteFeedback({
                        title: t('list.errors.linkedToEventsTitle'),
                        message: t('list.errors.linkedToEventsBulk', { count: linkedCount }),
                    });
                } else {
                    setBulkDeleteFeedback({
                        title: t('list.actions.bulkDeleteErrorTitle'),
                        message: t('list.errors.bulkDeleteFailed', { count: failedResults.length }),
                    });
                }
            }
        } catch (err) {
            console.error('Failed to bulk delete suppliers:', err);
            clear();
            setIsBulkDeleteAlertOpen(false);
            setBulkDeleteFeedback({
                title: t('list.actions.bulkDeleteErrorTitle'),
                message: t('list.errors.bulkDeleteFailed', { count: selectedIds.length }),
            });
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // Detail panel opens at 85% of the viewport by default; the resize
    // handle then lets the user adjust it to whatever size they want.
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1600;
    const supplierDetailDefaultWidth = Math.round(viewportWidth * 0.85);
    const supplierDetailMaxWidth = Math.round(viewportWidth * 0.98);

    return (
        // Need a wrapper fragment now that Modal is outside Card
        <>
            <Card className={`border border-neutral-200/60 dark:border-neutral-800/60 flex flex-col ${isSelectionMode ? 'shadow-none border-none h-auto' : 'h-[calc(100vh-160px)]'}`}>
                
                {/* A. Controls Section (Made sticky) */}
                {!isSelectionMode && (
                     <div className="sticky top-0 z-10 bg-card border-b border-neutral-200/60 dark:border-neutral-800/60 p-4 shadow-sm">
                        {/* Inner container for layout */}
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex-grow">
                                <SupplierControls categories={uniqueCategories} />
                            </div>
                            <button
                                type="button"
                                onClick={handleOpenImportModal}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-[13px] hover:bg-accent transition-colors"
                            >
                                <FiUpload size={16} className="text-blue-500" />
                                <span className="hidden lg:inline text-text-700 dark:text-text-300">
                                    {t('list.actions.import')}
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* B. Content Section - Added flex-1 and overflow-y-auto */}
                <div className={`flex-1 overflow-y-auto ${isSelectionMode ? '' : 'p-4'}`}>
                    {!isLoading && !error && !isSelectionMode && (
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold px-3 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary dark:text-primary-300">
                                    {t('list.table.summary.filteredCount', { count: totalFilteredSuppliers })}
                                </span>
                                {selectedCount > 0 && (
                                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                        {t('list.table.summary.selectedCount', { count: selectedCount })}
                                    </span>
                                )}
                                {(searchQuery || filterCategory !== 'all') && (
                                    <span className="text-xs text-text-400">
                                        {t('list.table.summary.showing', { shown: totalFilteredSuppliers, total: effectiveData?.items?.length || 0, defaultValue: 'a mostrar {{shown}} de {{total}}' })}
                                    </span>
                                )}
                            </div>

                            {selectedCount > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="ghost" size="sm" onClick={clear}>
                                        {t('list.table.selection.clear')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsBulkDeleteAlertOpen(true)}
                                        icon={<FiTrash2 className="h-4 w-4 text-error-500" />}
                                    >
                                        {t('list.actions.deleteSelected', { count: selectedCount })}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {isLoading ? (
                        <Skeleton variant="supplierList" />
                    ) : error ? (
                        <div className="flex items-center justify-center p-8 h-full">
                            <Text className="text-error-600 dark:text-error-400">
                                {t('list.errors.loadFailed', 'Failed to load suppliers')}
                            </Text>
                        </div>
                    ) : !displaySuppliers.length ? (
                        <NoSuppliers hasFilters={!!(searchQuery || filterCategory !== 'all')} />
                    ) : (
                        <div className="overflow-x-auto">
                            <div className="bg-background-100 dark:bg-background-800/50 border-b border-background-200 dark:border-background-700">
                                <div className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold tracking-wider uppercase text-muted-foreground min-w-[700px]">
                                    {!isSelectionMode && (
                                        <div className="w-11 flex-shrink-0" onClick={(event) => event.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                onChange={toggleAll}
                                                checked={allSelected}
                                                ref={(input) => {
                                                    if (input) input.indeterminate = someSelected;
                                                }}
                                                aria-label={t('list.table.selection.selectAll')}
                                                className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500 cursor-pointer accent-primary-500"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0 pr-2 font-semibold">{t('list.table.headers.name', 'Supplier')}</div>
                                    <div className="hidden lg:flex flex-1 min-w-[120px] pr-2">{t('list.table.headers.phone', 'Phone')}</div>
                                    {!isSelectionMode && <div className="hidden lg:flex w-[140px] flex-shrink-0 pr-2">{t('list.table.headers.contactName', 'Contact')}</div>}
                                    <div className="hidden lg:flex w-[100px] flex-shrink-0 pr-2">{t('list.table.headers.category', 'Category')}</div>
                                    <div className="hidden lg:flex w-[160px] flex-shrink-0 pr-2">{t('list.table.headers.budget', 'Budget')}</div>
                                    <div className="hidden lg:flex w-[100px] flex-shrink-0 pr-2">{t('list.table.headers.updated_at', 'Updated At')}</div>
                                    {!isSelectionMode && <div className="w-[50px] flex-shrink-0 text-center">{t('list.table.headers.actions', 'Actions')}</div>}
                                </div>
                            </div>
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                                {displaySuppliers.map((supplier) => (
                                    <SupplierListItem
                                        key={supplier.id}
                                        supplier={supplier}
                                        onShowModal={handleShowModal} 
                                        isSelectionMode={isSelectionMode} 
                                        onSupplierSelect={handleItemClick} 
                                        isSelected={isSelectionMode ? externalSelectedId === supplier.id : isTableSelected(supplier.id)} 
                                        showSelectionCheckbox={!isSelectionMode}
                                        onToggleSelection={toggle}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* C. Pagination */}
                {!isSelectionMode && totalFilteredSuppliers > itemsPerPage && (
                    <div className="p-4 border-t border-neutral-200/60 dark:border-neutral-800/60">
                        <SupplierPagination totalItems={totalFilteredSuppliers} />
                    </div>
                )}
            </Card> 

            {!isSelectionMode && (
                <DetailPanelShell
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    ariaLabel={t('details.panelAriaLabel', t('details.title'))}
                    resizable
                    defaultWidth={supplierDetailDefaultWidth}
                    minWidth={480}
                    maxWidth={supplierDetailMaxWidth}
                    storageKey="supplierDetailPanelWidth"
                    headerActions={selectedSupplierIdInternal && (
                        <>
                            <button
                                type="button"
                                onClick={handleEditSelected}
                                aria-label={t('list.actions.edit', 'Edit')}
                                title={t('list.actions.edit', 'Edit')}
                                className="p-2 rounded-full text-muted-foreground hover:text-secondary-600 dark:hover:text-secondary-400 hover:bg-muted transition-colors"
                            >
                                <FiEdit2 size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteSelectedClick}
                                aria-label={t('list.actions.delete', 'Delete')}
                                title={t('list.actions.delete', 'Delete')}
                                className="p-2 rounded-full text-muted-foreground hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/40 transition-colors"
                            >
                                <FiTrash2 size={16} />
                            </button>
                        </>
                    )}
                >
                    <div className="p-4 sm:p-6">
                        {selectedSupplierIdInternal ? (
                            <SupplierDetailContent supplierId={selectedSupplierIdInternal} />
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                {t('details.selectPrompt', 'Select a supplier to view details.')}
                            </div>
                        )}
                    </div>
                </DetailPanelShell>
            )}

            {isDeleteSelectedConfirmOpen && (
                <AlertPopup
                    isOpen={isDeleteSelectedConfirmOpen}
                    title={t('list.actions.confirmDeleteTitle', 'Confirm Deletion')}
                    message={t(
                        'list.actions.confirmDeleteMessage',
                        'Are you sure you want to delete the supplier "{{name}}"? This action cannot be undone.',
                        { name: selectedSupplierData?.name || '' },
                    )}
                    isConfirmation={true}
                    confirmText={t('list.actions.delete', 'Delete')}
                    cancelText={t('common:actions.cancel')}
                    onClose={handleConfirmDeleteSelected}
                    isDeleting={isDeletingSelected}
                    confirmColor="error"
                />
            )}

            {deleteSelectedError && (
                <AlertPopup
                    title={deleteSelectedError.title}
                    message={deleteSelectedError.message}
                    onClose={() => setDeleteSelectedError(null)}
                    confirmText={t('common:alert.ok')}
                />
            )}

            {isBulkDeleteAlertOpen && (
                <AlertPopup
                    title={t('list.actions.bulkDeleteTitle')}
                    message={t('list.actions.bulkDeleteMessage', { count: selectedCount })}
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

            {/* ADDED: Render Import Modal */}
             <ImportSuppliersModal
                isOpen={isImportModalOpen}
                onClose={handleCloseImportModal}
            />
        </> // Closing fragment
    );
};

// Add PropTypes for the new props
SupplierList.propTypes = {
    isSelectionMode: PropTypes.bool,
    selectedSupplierId: PropTypes.string,
    onSupplierSelect: PropTypes.func,
    suppliers: PropTypes.array,
    isLoadingExternal: PropTypes.bool,
    errorExternal: PropTypes.object,
};

export default SupplierList; 
