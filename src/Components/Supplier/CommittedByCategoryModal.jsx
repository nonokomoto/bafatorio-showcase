import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Modal } from '../UI';
import { getCategoryBadgeColor, getCategoryBadgeStyle } from './utils/categoryAndStatus.js';
import {
    summarizeByCategory,
    summarizeEventSupplierTotals,
    formatCurrencyEntries,
    NO_CATEGORY,
} from './utils/eventSupplierTotals';

// Share of the committed total, only when both sides are a single matching
// currency (a cross-currency percentage would be meaningless).
const shareOf = (entries, totalEntries) => {
    if (entries.length !== 1 || totalEntries.length !== 1) return null;
    const [[currency, amount]] = entries;
    const [[totalCurrency, total]] = totalEntries;
    if (currency !== totalCurrency || !total) return null;
    return Math.round((amount / total) * 100);
};

/**
 * Breakdown of the committed total (APPROVED + PAID quotes) per supplier
 * category, opened from the "Total comprometido" in the suppliers summary bar.
 */
const CommittedByCategoryModal = ({ isOpen, onClose, eventSuppliers, eventCurrency, categoryLabel }) => {
    const { t } = useTranslation(['supplier', 'common']);

    const { rows, committedTotal } = useMemo(() => {
        const { committed } = summarizeEventSupplierTotals(eventSuppliers, eventCurrency);
        return {
            rows: summarizeByCategory(eventSuppliers, eventCurrency).map((row) => ({
                ...row,
                share: shareOf(row.committed, committed),
            })),
            committedTotal: committed,
        };
    }, [eventSuppliers, eventCurrency]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" fullWidth ariaLabelledby="committed-by-category-title">
            <Modal.Header className="px-6 pt-5 pb-4">
                <div className="space-y-0.5">
                    <h2 id="committed-by-category-title" className="text-base font-semibold text-foreground">
                        {t('eventSupplierList.committedByCategory.title', 'Orçamento por categoria')}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        {t('eventSupplierList.committedByCategory.subtitle', 'Valor comprometido (fornecedores aprovados e pagos) em cada categoria.')}
                    </p>
                </div>
            </Modal.Header>
            <Modal.Body className="px-4 sm:px-6 py-4">
                {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                        {t('eventSupplierList.committedByCategory.empty', 'Sem fornecedores para mostrar.')}
                    </p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-background-200 dark:border-background-700">
                                <th scope="col" className="py-2 pr-3 font-medium">
                                    {t('eventSupplierList.committedByCategory.category', 'Categoria')}
                                </th>
                                <th scope="col" className="hidden sm:table-cell py-2 px-3 font-medium text-right">
                                    {t('eventSupplierList.committedByCategory.suppliers', 'Fornecedores')}
                                </th>
                                <th scope="col" className="py-2 pl-3 font-medium text-right">
                                    {t('eventSupplierList.committedByCategory.committed', 'Comprometido')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(({ category, count, committed, share }) => (
                                <tr key={category} className="border-b border-background-100 dark:border-background-800">
                                    <td className="py-2.5 pr-3">
                                        <Badge
                                            variant={category === NO_CATEGORY ? 'neutral' : getCategoryBadgeColor(category)}
                                            style={category === NO_CATEGORY ? undefined : getCategoryBadgeStyle(category)}
                                            tone={category === NO_CATEGORY ? 'light' : 'solid'}
                                            size="sm"
                                            className="w-fit"
                                        >
                                            {categoryLabel(category)}
                                        </Badge>
                                        <span className="sm:hidden ml-2 text-xs text-muted-foreground tabular-nums">
                                            {t('eventSupplierList.committedByCategory.supplierCount', { count, defaultValue: '{{count}} fornecedor(es)' })}
                                        </span>
                                        {share !== null && (
                                            <div
                                                className="mt-1.5 h-1 w-full max-w-[160px] rounded-full bg-background-100 dark:bg-background-700 overflow-hidden"
                                                aria-hidden="true"
                                            >
                                                <div className="h-full rounded-full bg-primary-500" style={{ width: `${share}%` }} />
                                            </div>
                                        )}
                                    </td>
                                    <td className="hidden sm:table-cell py-2.5 px-3 text-right tabular-nums text-muted-foreground">{count}</td>
                                    <td className="py-2.5 pl-3 text-right whitespace-nowrap tabular-nums font-medium text-text-800 dark:text-text-100">
                                        {formatCurrencyEntries(committed)}
                                        {share !== null && (
                                            <span className="block text-xs font-normal text-muted-foreground">{share}%</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th scope="row" className="pt-3 pr-3 text-left font-semibold text-text-800 dark:text-text-100">
                                    {t('eventSupplierList.summary.totalCommitted', 'Total comprometido')}
                                </th>
                                <td className="hidden sm:table-cell" />
                                <td className="pt-3 pl-3 text-right whitespace-nowrap tabular-nums font-semibold text-text-800 dark:text-text-100">
                                    {formatCurrencyEntries(committedTotal)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="outline" onClick={onClose}>
                    {t('common:actions.close', 'Fechar')}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

CommittedByCategoryModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    eventSuppliers: PropTypes.arrayOf(PropTypes.object).isRequired,
    eventCurrency: PropTypes.string,
    categoryLabel: PropTypes.func.isRequired,
};

export default CommittedByCategoryModal;
