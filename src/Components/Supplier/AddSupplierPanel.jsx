import { useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FiUserPlus, FiList } from 'react-icons/fi';

import DetailPanelShell from '../UI/DetailPanelShell';
import { Button, Text } from '../UI';
import SupplierControls from './SupplierControls';
import SupplierList from './SupplierList';
import SupplierFormFields from './SupplierFormFields';
import { useCreateSupplierMutation } from '../../Api/services/supplierApi';
import { useSelectEventSupplierMutation } from '../../Api/services/eventSupplierApi';
import { billingGateReasonFromError, billingGateMessageKey } from '../../Hook/useAuthz';

const TAB_LIST = 'list';
const TAB_MANUAL = 'manual';

const TAB_DEFINITIONS = [
    { id: TAB_LIST, labelKey: 'eventSupplierList.addPanel.tabs.fromList', defaultLabel: 'From list', icon: FiList, permission: 'canSelectSupplier' },
    { id: TAB_MANUAL, labelKey: 'eventSupplierList.addPanel.tabs.manual', defaultLabel: 'Manual', icon: FiUserPlus, permission: 'canManageSuppliers' },
];

const EMPTY_MANUAL_DEFAULTS = {
    name: '',
    country: '',
    category: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    vatNumber: '',
    address: '',
    estimateMinAmount: '',
    estimateMaxAmount: '',
    estimateUnit: '',
    currency: '',
    tags: '',
    notes: '',
    beneficiaryName: '',
    iban: '',
    swiftBic: '',
    bankName: '',
};

const AddSupplierPanel = ({
    isOpen,
    onClose,
    eventId,
    suppliers,
    existingCategories,
    isLoadingSuppliers,
    canManageSuppliers,
    canSelectSupplier,
}) => {
    const { t } = useTranslation(['supplier', 'common']);

    const availableTabs = useMemo(() => TAB_DEFINITIONS.filter((tab) => {
        if (tab.permission === 'canSelectSupplier') return !!canSelectSupplier;
        if (tab.permission === 'canManageSuppliers') return !!canManageSuppliers;
        return true;
    }), [canSelectSupplier, canManageSuppliers]);

    const [activeTab, setActiveTab] = useState(availableTabs[0]?.id ?? TAB_LIST);
    const [selectedSupplierId, setSelectedSupplierId] = useState(null);
    const [submitError, setSubmitError] = useState(null);
    // Manual submit = 2 sequential RTK mutations (createSupplier → selectEventSupplier).
    // Between them both RTK isLoading flags drop to false for one render, causing
    // the button to flash back to "Create and associate" + no spinner before
    // flipping to "Creating..." again. This local flag brackets the whole flow
    // so the button stays in a single loading state end-to-end.
    const [isSubmittingManual, setIsSubmittingManual] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm({ defaultValues: EMPTY_MANUAL_DEFAULTS });

    const [selectEventSupplier, { isLoading: isAssociating }] = useSelectEventSupplierMutation();
    const [createSupplier] = useCreateSupplierMutation();

    useEffect(() => {
        if (!isOpen) return;
        const firstAvailable = availableTabs[0]?.id ?? TAB_LIST;
        setActiveTab((current) => (availableTabs.some((tab) => tab.id === current) ? current : firstAvailable));
        setSelectedSupplierId(null);
        setSubmitError(null);
        reset(EMPTY_MANUAL_DEFAULTS);
    }, [isOpen, availableTabs, reset]);

    const handleAssociateFromList = async () => {
        if (!selectedSupplierId || !eventId) return;
        setSubmitError(null);
        try {
            await selectEventSupplier({ eventId, supplierId: selectedSupplierId }).unwrap();
            onClose();
        } catch (err) {
            // Log raw error for diagnostics; show a translated, sanitized
            // message to the user. Backend error strings may contain stack
            // traces or internal identifiers that should not reach the UI.
            console.error('[AddSupplierPanel] Failed to associate supplier:', err);
            const gateReason = billingGateReasonFromError(err);
            setSubmitError(
                gateReason
                    ? t(`common:${billingGateMessageKey(gateReason)}`)
                    : t('eventSupplierList.addPanel.errors.associate', 'Could not associate the supplier. Please try again.'),
            );
        }
    };

    const onManualSubmit = async (data) => {
        if (!eventId) return;
        setSubmitError(null);

        const paymentDetailsObj = {};
        if (data.beneficiaryName?.trim()) paymentDetailsObj.beneficiaryName = data.beneficiaryName.trim();
        if (data.iban?.trim()) paymentDetailsObj.iban = data.iban.trim();
        if (data.swiftBic?.trim()) paymentDetailsObj.swiftBic = data.swiftBic.trim();
        if (data.bankName?.trim()) paymentDetailsObj.bankName = data.bankName.trim();

        const input = {
            name: data.name?.trim() || '',
            country: data.country?.trim() || null,
            category: data.category?.trim() || null,
            contactName: data.contactName?.trim() || null,
            contactEmail: data.contactEmail?.trim() || null,
            contactPhone: data.contactPhone?.trim() || null,
            website: data.website?.trim() || null,
            vatNumber: data.vatNumber?.trim() || null,
            address: data.address?.trim() || null,
            estimateMinAmount: data.estimateMinAmount ? parseFloat(data.estimateMinAmount) : null,
            estimateMaxAmount: data.estimateMaxAmount ? parseFloat(data.estimateMaxAmount) : null,
            estimateUnit: data.estimateUnit || null,
            currency: data.currency || null,
            tags: data.tags ? data.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : null,
            notes: data.notes?.trim() || null,
            paymentDetails: Object.keys(paymentDetailsObj).length > 0
                ? JSON.stringify(paymentDetailsObj)
                : null,
        };

        Object.keys(input).forEach((key) => {
            if (input[key] === null || input[key] === undefined || input[key] === '') {
                delete input[key];
            }
        });

        setIsSubmittingManual(true);
        // Track whether create already succeeded so we can distinguish between
        // "nothing persisted" and "supplier landed in the catalog but the
        // event link failed" — the orphan case is recoverable from the List
        // tab and the user needs different guidance for each.
        let supplierPersisted = false;
        try {
            const created = await createSupplier(input).unwrap();
            const createdId = created?.id;
            if (!createdId) {
                throw new Error('Missing supplier ID after creation');
            }
            supplierPersisted = true;
            await selectEventSupplier({ eventId, supplierId: createdId }).unwrap();
            onClose();
        } catch (err) {
            // Log raw error for diagnostics; show a sanitized, translated
            // message. Split the message based on whether the Supplier was
            // already created — the "orphan" case is not a data loss since
            // the Supplier remains reusable from the List tab.
            console.error('[AddSupplierPanel] Failed to create + associate supplier:', {
                err,
                supplierPersisted,
            });
            // Recusa do gate primeiro: explica o PORQUÊ (janela fechada, limite)
            // — mais acionável que a mensagem genérica; o fornecedor criado
            // continua recuperável na tab "From list" em qualquer dos casos.
            const gateReason = billingGateReasonFromError(err);
            setSubmitError(
                gateReason
                    ? t(`common:${billingGateMessageKey(gateReason)}`)
                    : supplierPersisted
                    ? t(
                        'eventSupplierList.addPanel.errors.associateAfterCreate',
                        'The supplier was created in the catalog, but linking it to the event failed. Find it under the "From list" tab and associate it manually.',
                    )
                    : t(
                        'eventSupplierList.addPanel.errors.createAndAssociate',
                        'Could not create the supplier. Please try again.',
                    ),
            );
        } finally {
            setIsSubmittingManual(false);
        }
    };

    return (
        <DetailPanelShell
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel={t('eventSupplierList.addPanel.title', 'Add supplier')}
            resizable
            defaultWidth={720}
            minWidth={480}
            maxWidth={1200}
            storageKey="addSupplierPanelWidth"
        >
            <div className="flex flex-col h-full">
                <div className="px-8 py-5 border-b border-border">
                    <Text variant="h6" weight="medium">
                        {t('eventSupplierList.addPanel.title', 'Add supplier')}
                    </Text>
                    <Text variant="caption" className="text-muted-foreground">
                        {t('eventSupplierList.addPanel.subtitle', 'Pick from your supplier list or create a new one for this event.')}
                    </Text>
                </div>

                {availableTabs.length > 1 && (
                    <div role="tablist" aria-label={t('eventSupplierList.addPanel.tabsLabel', 'Add supplier tabs')} className="flex border-b border-border bg-muted/20">
                        {availableTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    aria-controls={`add-supplier-panel-${tab.id}`}
                                    id={`add-supplier-tab-${tab.id}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 bg-card'
                                            : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
                                    }`}
                                >
                                    <Icon className="text-base" />
                                    {t(tab.labelKey, tab.defaultLabel)}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto min-h-0">
                    {activeTab === TAB_LIST && (
                        <div
                            id={`add-supplier-panel-${TAB_LIST}`}
                            role="tabpanel"
                            aria-labelledby={`add-supplier-tab-${TAB_LIST}`}
                            className="flex flex-col min-h-0"
                        >
                            <div className="px-8 py-4 border-b border-border bg-card sticky top-0 z-10">
                                <SupplierControls
                                    isCompact={true}
                                    className="w-full"
                                    categories={existingCategories}
                                />
                            </div>
                            <div className="flex-1">
                                <SupplierList
                                    isSelectionMode={true}
                                    selectedSupplierId={selectedSupplierId}
                                    onSupplierSelect={setSelectedSupplierId}
                                    suppliers={suppliers}
                                    isLoadingExternal={isLoadingSuppliers}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === TAB_MANUAL && (
                        <form
                            id={`add-supplier-panel-${TAB_MANUAL}`}
                            role="tabpanel"
                            aria-labelledby={`add-supplier-tab-${TAB_MANUAL}`}
                            onSubmit={handleSubmit(onManualSubmit)}
                            className="p-8 space-y-6"
                        >
                            <SupplierFormFields
                                register={register}
                                control={control}
                                errors={errors}
                                t={t}
                                includeName={true}
                            />
                        </form>
                    )}
                </div>

                {submitError && (
                    <div className="px-8 py-3 bg-error/10 border-t border-error/30 text-error text-sm">
                        {submitError}
                    </div>
                )}

                <div className="flex-shrink-0 flex items-center justify-end gap-3 px-8 py-4 border-t border-border bg-card">
                    {/* Cancel stays enabled during submit so the loading state is clearly
                        scoped to the primary button. Dimming both buttons together makes
                        the footer look like it has a loading overlay — same pattern as
                        the prior fix in the approve modal (commit f854679a). The in-flight
                        mutations continue in the background if the user cancels mid-flow. */}
                    <Button variant="outline" onClick={onClose}>
                        {t('common:actions.cancel', 'Cancel')}
                    </Button>
                    {activeTab === TAB_LIST && (
                        <Button
                            variant="primary"
                            onClick={handleAssociateFromList}
                            disabled={!selectedSupplierId}
                            loading={isAssociating}
                        >
                            {isAssociating
                                ? t('common:actions.associating', 'Associating...')
                                : t('eventSupplierList.addPanel.cta.associate', 'Associate supplier')}
                        </Button>
                    )}
                    {activeTab === TAB_MANUAL && (
                        <Button
                            variant="primary"
                            type="submit"
                            form={`add-supplier-panel-${TAB_MANUAL}`}
                            loading={isSubmittingManual}
                        >
                            {isSubmittingManual
                                ? t('eventSupplierList.addPanel.cta.creating', 'Creating...')
                                : t('eventSupplierList.addPanel.cta.createAndAssociate', 'Create and associate')}
                        </Button>
                    )}
                </div>
            </div>
        </DetailPanelShell>
    );
};

AddSupplierPanel.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    eventId: PropTypes.string.isRequired,
    suppliers: PropTypes.array,
    existingCategories: PropTypes.array,
    isLoadingSuppliers: PropTypes.bool,
    canManageSuppliers: PropTypes.bool,
    canSelectSupplier: PropTypes.bool,
};

export default AddSupplierPanel;
