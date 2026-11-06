import { useState } from 'react';
import PropTypes from 'prop-types';
import { FiEdit2, FiTrash2, FiEye, FiMoreHorizontal } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

// Import UI Components
import { Badge, Dropdown } from '../UI/index.js';

// Import AlertPopup and Delete Mutation Hook
import AlertPopup from '../Layout/AlertPopUp';
import { useDeleteSupplierMutation } from '../../Api/services/supplierApi';

import { getCategoryBadgeColor, getCategoryBadgeStyle } from './utils/categoryAndStatus.js';

// Helper function to format currency
const formatCurrency = (amount, currency) => {
    if (amount === null || amount === undefined || amount === '') return null;
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) return null;
    
    return new Intl.NumberFormat('pt-PT', { 
        style: 'currency',
        currency: currency || 'EUR',
        minimumFractionDigits: 0, 
        maximumFractionDigits: 2, 
    }).format(numericAmount);
};

// Helper function to format date
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        return new Intl.DateTimeFormat('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(new Date(dateString));
    } catch (error) {
        console.error("Error formatting date:", error);
        return '-';
    }
};

// Helper function to format estimate unit using translation
const formatEstimateUnit = (unit, t) => {
    if (!unit || unit === 'FIXED') return '';
    const key = `units.${unit}`;
    const defaultValue = unit.toLowerCase().replace('per_', '/ ');
    const translated = t(key, defaultValue);
    return translated.startsWith('/') ? translated : ` / ${translated}`; 
};

const SupplierListItem = ({ 
    supplier, 
    onShowModal, 
    isSelectionMode = false,
    isSelected = false,
    onSupplierSelect,
    showSelectionCheckbox = false,
    onToggleSelection,
}) => {
    const { t } = useTranslation(['supplier']);
    const navigate = useNavigate();
    // State for delete confirmation popup
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deleteError, setDeleteError] = useState(null); // { title, message }
    // Delete mutation hook
    const [deleteSupplier, { isLoading: isDeleting }] = useDeleteSupplierMutation();

    const handleEdit = () => {
        if (isSelectionMode) return; 
        navigate(`/app/suppliers/edit/${supplier.id}`);
    };

    // Opens the confirmation popup
    const handleDeleteClick = (e) => {
        e.stopPropagation(); // Prevent triggering row click
        if (isSelectionMode) return;
        setIsConfirmOpen(true);
    };

    // Executes the deletion after confirmation
    const handleConfirmDelete = async () => {
        try {
            await deleteSupplier(supplier.id).unwrap();
        } catch (err) {
            if (err?.code === 'SUPPLIER_LINKED_TO_EVENTS') {
                setDeleteError({
                    title: t('supplier:list.errors.linkedToEventsTitle'),
                    message: t('supplier:list.errors.linkedToEvents', { count: err.eventCount ?? 1 }),
                });
            } else {
                setDeleteError({
                    title: t('supplier:list.errors.deleteFailedTitle'),
                    message: t('supplier:list.errors.deleteFailed'),
                });
            }
        } finally {
            setIsConfirmOpen(false);
        }
    };

    const handleViewDetails = (e) => {
        e.stopPropagation(); // Prevent triggering row click if clicking specifically view
        if (isSelectionMode || !onShowModal) return;
        onShowModal(supplier.id);
    };

    // Handle click on the main item row (for selection or details)
    const handleItemClick = (event) => {
        if (event?.target?.closest('button, a, input, [role="menuitem"]')) {
            return;
        }

        if (isSelectionMode && onSupplierSelect) {
            onSupplierSelect(supplier.id);
            return;
        }

        if (onShowModal) {
            onShowModal(supplier.id);
        }
    };

    const handleRowKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleItemClick(event);
        }
    };

    const estimateMinFormatted = formatCurrency(supplier.estimateMinAmount, supplier.currency);
    const estimateMaxFormatted = formatCurrency(supplier.estimateMaxAmount, supplier.currency);
    const estimateUnitFormatted = formatEstimateUnit(supplier.estimateUnit, t);

    let budgetString = t('supplier:states.unavailable', '—');
    if (estimateMinFormatted && estimateMaxFormatted) {
        budgetString = `${estimateMinFormatted} - ${estimateMaxFormatted}${estimateUnitFormatted}`;
    } else if (estimateMaxFormatted) {
        budgetString = `${estimateMaxFormatted}${estimateUnitFormatted}`;
    } else if (estimateMinFormatted) {
        budgetString = `${estimateMinFormatted}${estimateUnitFormatted}`; 
    }

    const updateDate = formatDate(supplier.updatedAt || supplier.createdAt);

    const dropdownTrigger = (
        <button
            type="button"
            title={t('supplier:actions.moreOptions', 'More options')}
            className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-background-200 dark:hover:bg-background-700 transition-colors duration-150 cursor-pointer"
        >
            <FiMoreHorizontal className="h-4 w-4" />
        </button>
    );

    const selectedBgClass = isSelected ? 'bg-primary-50 dark:bg-primary-900/30' : '';
    const hoverBgClass = !isSelectionMode 
        ? 'hover:bg-background-100/80 dark:hover:bg-background-700/70' 
        : 'hover:bg-primary-50/50 dark:hover:bg-primary-900/20';
    const itemCursorClass = (isSelectionMode || onShowModal) ? 'cursor-pointer' : '';

    return (
        <>
            <div
                className={`transition-colors duration-150 ${itemCursorClass} ${selectedBgClass} ${hoverBgClass}`}
                onClick={isSelectionMode || onShowModal ? handleItemClick : undefined}
                onKeyDown={isSelectionMode || onShowModal ? handleRowKeyDown : undefined}
                role={isSelectionMode || onShowModal ? 'button' : undefined}
                tabIndex={isSelectionMode || onShowModal ? 0 : undefined}
            >
               <div className="flex items-center gap-3 px-4 py-2.5 border-b border-background-100 dark:border-background-700 text-sm min-w-[700px]" > 
                    {showSelectionCheckbox && (
                        <div className="w-11 flex-shrink-0" onClick={(event) => event.stopPropagation()}>
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => onToggleSelection?.(supplier.id)}
                                aria-label={t('list.table.selection.selectSupplier', { name: supplier.name || '' })}
                                className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500 cursor-pointer accent-primary-500"
                            />
                        </div>
                    )}

                    {/* Column: Supplier Name */}
                    <div className="flex-1 min-w-0 pr-2">
                        <div className="min-w-0">
                            <div
                                className="text-[13px] font-medium text-foreground truncate"
                                title={supplier.name}
                            >
                                {supplier.name || t('common:states.unavailable', '—')}
                            </div>
                            {supplier.contactEmail && (
                                <div
                                    className="text-xs text-muted-foreground truncate"
                                    title={supplier.contactEmail}
                                >
                                    {supplier.contactEmail}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Column: Phone */}
                    <div className="hidden lg:flex flex-1 min-w-[120px] pr-2 items-center">
                        {supplier.contactPhone ? (
                            <span
                                className="text-[13px] text-muted-foreground truncate"
                                title={supplier.contactPhone}
                            >
                                {supplier.contactPhone}
                            </span>
                        ) : (
                            <span className="text-[13px] text-muted-foreground">—</span>
                        )}
                    </div>

                    {/* Column: Contact Person - Conditionally render */}
                    {!isSelectionMode && (
                        <div className="hidden lg:flex w-[140px] flex-shrink-0 pr-2 items-center">
                            {supplier.contactName ? (
                                <span
                                    className="text-[13px] text-muted-foreground truncate"
                                    title={supplier.contactName}
                                >
                                    {supplier.contactName}
                                </span>
                            ) : (
                                <span className="text-[13px] text-muted-foreground">—</span>
                            )}
                        </div>
                    )}

                    {/* Column: Category */}
                    <div className="hidden lg:flex w-[100px] flex-shrink-0 pr-2 items-center">
                        {supplier.category ? (
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

                    {/* Column: Budget (Estimate) */}
                    <div className="hidden lg:flex w-[160px] flex-shrink-0 pr-2 items-center">
                        <span
                            className="text-[13px] text-muted-foreground truncate"
                            title={budgetString !== t('supplier:states.unavailable', '—') ? budgetString : ''}
                        >
                            {budgetString}
                        </span>
                    </div>

                    {/* Column: Updated At */}
                    <div className="hidden lg:flex w-[100px] flex-shrink-0 pr-2 items-center">
                        <span className="text-xs text-muted-foreground truncate">
                            {updateDate}
                        </span>
                    </div>

                    {/* Column: Actions - Conditionally render */}
                    {!isSelectionMode && (
                        <div className="flex items-center justify-center w-[50px] flex-shrink-0 text-center" onClick={(event) => event.stopPropagation()}>
                            <Dropdown trigger={dropdownTrigger} menuClassName="divide-y divide-background-100 dark:divide-background-700">
                                {/* View Details */}
                                <div className="py-1">
                                    <button
                                        onClick={handleViewDetails}
                                        className="hover:bg-background-100 dark:hover:bg-background-700/60 group flex w-full items-center rounded-md px-3 py-2 text-sm text-text-700 dark:text-text-200 transition-colors duration-100"
                                    >
                                        <FiEye className="mr-3 h-4 w-4 text-text-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-100" aria-hidden="true" />
                                        {t('list.actions.view', 'View Details')}
                                    </button>
                                </div>
                                {/* Edit */}
                                <div className="py-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEdit(); }}
                                        className="hover:bg-background-100 dark:hover:bg-background-700/60 group flex w-full items-center rounded-md px-3 py-2 text-sm text-text-700 dark:text-text-200 transition-colors duration-100"
                                    >
                                        <FiEdit2 className="mr-3 h-4 w-4 text-text-400 group-hover:text-secondary-600 dark:group-hover:text-secondary-400 transition-colors duration-100" aria-hidden="true" />
                                        {t('list.actions.edit', 'Edit')}
                                    </button>
                                </div>
                                {/* Delete */}
                                <div className="py-1">
                                    <button
                                        onClick={handleDeleteClick}
                                        className="hover:bg-error-50 dark:hover:bg-error-900/40 group flex w-full items-center rounded-md px-3 py-2 text-sm text-error-600 dark:text-error-400 transition-colors duration-100"
                                    >
                                        <FiTrash2 className="mr-3 h-4 w-4 group-hover:text-error-600 dark:group-hover:text-error-400 transition-colors duration-100" aria-hidden="true" />
                                        {t('list.actions.delete', 'Delete')}
                                    </button>
                                </div>
                            </Dropdown>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Delete error feedback */}
            {deleteError && (
                <AlertPopup
                    title={deleteError.title}
                    message={deleteError.message}
                    onClose={() => setDeleteError(null)}
                />
            )}

            {/* Confirmation Popup */}
            {isConfirmOpen && (
                <AlertPopup
                    isOpen={isConfirmOpen} // Pass isOpen prop if AlertPopup uses it
                    title={t('supplier:list.actions.confirmDeleteTitle', 'Confirm Deletion')} // Use specific namespace if needed
                    message={t('supplier:list.actions.confirmDeleteMessage', 'Are you sure you want to delete the supplier "{{name}}"? This action cannot be undone.', { name: supplier?.name || '' })}
                    isConfirmation={true}
                    confirmText={t('supplier:list.actions.delete', 'Delete')}
                    cancelText={t('supplier:form.buttons.cancel', 'Cancel')}
                    onClose={(confirmed) => {
                        if (confirmed) {
                            handleConfirmDelete();
                        } else {
                            setIsConfirmOpen(false);
                        }
                    }}
                    isDeleting={isDeleting}
                    confirmColor="error"
                />
            )}
        </>
    );
};

SupplierListItem.propTypes = {
    supplier: PropTypes.object.isRequired,
    onShowModal: PropTypes.func, // Remains optional
    isSelectionMode: PropTypes.bool,
    isSelected: PropTypes.bool,
    onSupplierSelect: PropTypes.func,
    showSelectionCheckbox: PropTypes.bool,
    onToggleSelection: PropTypes.func,
};

export default SupplierListItem; 
