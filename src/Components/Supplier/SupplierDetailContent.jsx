import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiPhone, FiGlobe, FiMapPin, FiFileText, FiCreditCard, FiUser, FiMail, FiTag, FiHome, FiCheckCircle, FiXCircle, FiClock, FiLoader } from 'react-icons/fi';
import { useGetSupplierQuery, useGetSupplierForEventQuery } from '../../Api/services/supplierApi';
import { Text, Badge } from '../UI';

const DetailItem = ({ icon: Icon, label, value, isLink = false, children, className = '' }) => {
    const { t } = useTranslation('supplier');
    const hasValue = (value && typeof value === 'string' && value.trim() !== '') || children;
    
    return (
        <div className={`flex items-start gap-3 ${className}`}>
            {Icon && (
                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                    <Icon className={`${hasValue ? 'text-primary-600 dark:text-primary-400' : 'text-primary-400 dark:text-primary-500'} w-4 h-4`} />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <Text variant="caption" className="text-muted-foreground block mb-1 font-medium">
                    {label}
                </Text>
                {children ? (
                    <div className="mt-0.5">{children}</div>
                ) : isLink && hasValue ? (
                    <a 
                        href={value.startsWith('http') ? value : `https://${value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:underline break-words font-medium"
                    >
                        {value}
                    </a>
                ) : (
                    <Text variant="body2" className={`${!hasValue ? "text-muted-foreground italic" : "text-text-700 dark:text-text-200"} break-words font-medium`}>
                        {hasValue ? value : t('supplier:states.unavailable', '—')}
                    </Text>
                )}
            </div>
        </div>
    );
};

const DetailSection = ({ title, children, className = '' }) => (
    <div className={`rounded-lg border border-background-200 dark:border-background-700 overflow-hidden ${className}`}>
        <div className="bg-background-50 dark:bg-background-800/50 px-4 py-3 border-b border-background-200 dark:border-background-700">
            <Text variant="subtitle2" className="text-text-700 dark:text-text-200 font-semibold">
                {title}
            </Text>
        </div>
        <div className="p-4 bg-card">
            {children}
        </div>
    </div>
);

const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
        case 'ACTIVE':
            return 'success';
        case 'INACTIVE':
            return 'error';
        case 'PENDING':
            return 'warning';
        default:
            return 'neutral';
    }
};

const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
        case 'ACTIVE':
            return <FiCheckCircle className="w-4 h-4" />;
        case 'INACTIVE':
            return <FiXCircle className="w-4 h-4" />;
        case 'PENDING':
            return <FiClock className="w-4 h-4" />;
        default:
            return null;
    }
};

const SupplierDetailContent = ({ supplierId, eventId }) => {
    const { t } = useTranslation(['supplier', 'common']);

    // Use event-scoped query when eventId is provided (for collaborators),
    // fall back to direct getSupplier (for owners viewing from supplier management)
    const eventScopedQuery = useGetSupplierForEventQuery(
        { supplierId, eventId },
        { skip: !supplierId || !eventId, refetchOnMountOrArgChange: true }
    );
    const directQuery = useGetSupplierQuery(supplierId, {
        skip: !supplierId || !!eventId,
        refetchOnMountOrArgChange: true,
    });

    const { data: supplier, isLoading, error } = eventId ? eventScopedQuery : directQuery;

    // --- Parse Payment Details --- 
    let paymentData = {};
    if (supplier?.paymentDetails) {
        try {
            paymentData = JSON.parse(supplier.paymentDetails);
        } catch (e) {
            console.error("Failed to parse paymentDetails JSON in DetailContent:", e);
            paymentData = {}; // Reset if parsing fails
        }
    }
    const hasFinancialData = Object.keys(paymentData).length > 0 && Object.values(paymentData).some(v => v);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-10">
                <FiLoader className="text-primary animate-spin" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center p-6">
                <Text color="error">{t('details.error')}</Text>
            </div>
        );
    }

    if (!supplier) {
        return (
            <div className="flex items-center justify-center p-6">
                <Text color="warning">{t('details.notFound')}</Text>
            </div>
        );
    }

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined || amount === '') return t('supplier:states.unavailable', '—');
        const numericAmount = Number(amount);
        if (isNaN(numericAmount)) return t('supplier:states.unavailable', '—');

        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: supplier.currency || 'EUR'
        }).format(numericAmount);
    };

    return (
        <div className="space-y-6">
            {/* Header com Nome, Categoria e Status */}
            <div className="bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 rounded-lg p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1">
                        <Text variant="overline" className="text-primary-600 dark:text-primary-400 mb-1">
                            {t('form.fields.name.label')}
                        </Text>
                        <Text variant="h4" className="text-text-900 dark:text-text-50 font-semibold mb-2">
                            {supplier.name}
                        </Text>
                        <div className="flex flex-wrap items-center gap-3">
                            {supplier.category && (
                                <Badge 
                                    color="primary" 
                                    variant="light" 
                                    size="lg"
                                    className="w-fit"
                                >
                                    {supplier.category}
                                </Badge>
                            )}
                            {supplier.status && (
                                <div className="flex items-center gap-2">
                                    <Badge 
                                        color={getStatusColor(supplier.status)}
                                        variant="light" 
                                        size="lg"
                                        className="w-fit"
                                    >
                                        {getStatusIcon(supplier.status)}
                                        <span className="ml-1">{t(`status.${supplier.status.toLowerCase()}`, supplier.status)}</span>
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Informação de Orçamento em Destaque */}
                    {(supplier.estimateMinAmount || supplier.estimateMaxAmount) && (
                        <div className="bg-white/50 dark:bg-background-800/50 rounded-lg p-4 min-w-[200px]">
                            <Text variant="caption" className="text-muted-foreground block mb-1">
                                {t('form.fields.estimateRange.label', 'Faixa de Orçamento')}
                            </Text>
                            <div className="space-y-1">
                                {supplier.estimateMinAmount && (
                                    <Text variant="body2" className="text-text-700 dark:text-text-200 font-medium">
                                        Min: {formatCurrency(supplier.estimateMinAmount)}
                                    </Text>
                                )}
                                {supplier.estimateMaxAmount && (
                                    <Text variant="body2" className="text-text-700 dark:text-text-200 font-medium">
                                        Max: {formatCurrency(supplier.estimateMaxAmount)}
                                    </Text>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informações de Contato */}
                <DetailSection title={t('form.sections.contact')}>
                    <div className="space-y-4">
                        <DetailItem
                            icon={FiUser}
                            label={t('form.fields.contactName.label')}
                            value={supplier.contactName}
                        />
                        <DetailItem
                            icon={FiPhone}
                            label={t('form.fields.contactPhone.label')}
                            value={supplier.contactPhone}
                        />
                        <DetailItem
                            icon={FiMail}
                            label={t('form.fields.contactEmail.label')}
                            value={supplier.contactEmail}
                        />
                        <DetailItem
                            icon={FiGlobe}
                            label={t('form.fields.website.label')}
                            value={supplier.website}
                            isLink
                        />
                    </div>
                </DetailSection>

                {/* Endereço e Informações Legais */}
                <DetailSection title={t('form.sections.addressLegal')}>
                    <div className="space-y-4">
                        <DetailItem
                            icon={FiMapPin}
                            label={t('form.fields.country.label')}
                            value={supplier.country}
                        />
                        <DetailItem
                            icon={FiMapPin}
                            label={t('form.fields.address.label')}
                            value={supplier.address}
                        />
                        <DetailItem
                            icon={FiFileText}
                            label={t('form.fields.vatNumber.label')}
                            value={supplier.vatNumber}
                        />
                    </div>
                </DetailSection>

                {/* Detalhes do Orçamento */}
                {(supplier.estimateMinAmount || supplier.estimateMaxAmount || supplier.currency) && (
                    <DetailSection title={t('form.sections.budgetDetails')}>
                        <div className="space-y-4">
                            <DetailItem
                                icon={FiCreditCard}
                                label={t('form.fields.estimateMin.label')}
                                value={formatCurrency(supplier.estimateMinAmount)}
                            />
                            <DetailItem
                                icon={FiCreditCard}
                                label={t('form.fields.estimateMax.label')}
                                value={formatCurrency(supplier.estimateMaxAmount)}
                            />
                            <DetailItem
                                icon={FiTag}
                                label={t('form.fields.currency.label')}
                                value={supplier.currency ? t(`currencies.${supplier.currency}`, supplier.currency) : t('supplier:states.unavailable', '—')}
                            />
                            <DetailItem
                                icon={FiTag}
                                label={t('form.fields.estimateUnit.label')}
                                value={supplier.estimateUnit ? t(`units.${supplier.estimateUnit}`, supplier.estimateUnit) : t('supplier:states.unavailable', '—')}
                            />
                        </div>
                    </DetailSection>
                )}

                {/* Informações Financeiras */}
                {hasFinancialData && (
                    <DetailSection title={t('form.sections.financial')}>
                        <div className="space-y-4">
                            <DetailItem
                                icon={FiUser}
                                label={t('form.fields.beneficiaryName.label')}
                                value={paymentData.beneficiaryName}
                            />
                            <DetailItem
                                icon={FiCreditCard}
                                label={t('form.fields.iban.label')}
                                value={paymentData.iban}
                            />
                            <DetailItem
                                icon={FiGlobe}
                                label={t('form.fields.swiftBic.label')}
                                value={paymentData.swiftBic}
                            />
                            <DetailItem
                                icon={FiHome}
                                label={t('form.fields.bankName.label')}
                                value={paymentData.bankName}
                            />
                        </div>
                    </DetailSection>
                )}
            </div>

            {/* Seção de Informações Complementares */}
            <DetailSection title={t('form.sections.complementary', 'Informações Complementares')}>
                <div className="space-y-6">
                    {/* Tags e Local */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tags */}
                        {supplier.tags && supplier.tags.length > 0 && (
                            <div>
                                <Text variant="subtitle2" className="text-muted-foreground mb-3">
                                    {t('form.fields.tags.label', 'Tags')}
                                </Text>
                                <div className="flex flex-wrap gap-2">
                                    {supplier.tags.map((tag, index) => (
                                        <Badge 
                                            key={index} 
                                            color="neutral" 
                                            variant="light"
                                            size="sm"
                                        >
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Local */}
                        {supplier.location && (
                            <div>
                                <Text variant="subtitle2" className="text-muted-foreground mb-3">
                                    {t('form.fields.location.label', 'Local')}
                                </Text>
                                <div className="bg-background-50 dark:bg-background-800/50 rounded-lg p-3">
                                    <DetailItem
                                        icon={FiMapPin}
                                        value={supplier.location}
                                        className="!gap-2"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notas */}
                    {supplier.notes && (
                        <div>
                            <Text variant="subtitle2" className="text-muted-foreground mb-3">
                                {t('form.fields.notes.label', 'Notas')}
                            </Text>
                            <div className="bg-background-50 dark:bg-background-800/50 rounded-lg p-4">
                                <Text variant="body2" className="text-muted-foreground whitespace-pre-wrap">
                                    {supplier.notes}
                                </Text>
                            </div>
                        </div>
                    )}
                </div>
            </DetailSection>
        </div>
    );
};

DetailItem.propTypes = {
    icon: PropTypes.elementType,
    label: PropTypes.string.isRequired,
    value: PropTypes.string,
    isLink: PropTypes.bool,
    children: PropTypes.node,
    className: PropTypes.string
};

DetailSection.propTypes = {
    title: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    className: PropTypes.string
};

SupplierDetailContent.propTypes = {
    supplierId: PropTypes.string.isRequired,
    eventId: PropTypes.string,
};

export default SupplierDetailContent; 