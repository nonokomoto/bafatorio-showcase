import { View, Text, StyleSheet } from '@react-pdf/renderer';
import PropTypes from 'prop-types';
import { theme } from '../theme';
import { sharedStyles } from './shared/styles';
import SectionTitle from './shared/SectionTitle';
import { formatCurrency } from '../utils/formatters';

const styles = StyleSheet.create({
  section: { ...sharedStyles.section },
  content: { ...sharedStyles.content },
  highlight: { ...sharedStyles.highlight },
  paragraph: { ...sharedStyles.paragraph },
  rankingTitle: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.default,
    fontFamily: theme.typography.fontFamily.display,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md
  },
  tableWrapper: {
    ...sharedStyles.card,
    padding: 0,
    overflow: 'hidden'
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.light,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  row: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  rowAlt: {
    backgroundColor: theme.colors.background.default
  },
  lastRow: {
    borderBottomWidth: 0
  },
  nameCol: {
    flex: 2,
    color: theme.colors.text.default,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.primary
  },
  categoryCol: {
    flex: 1,
    color: theme.colors.text.light,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.primary
  },
  statusCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  amountCol: {
    flex: 1,
    textAlign: 'right',
    color: theme.colors.text.default,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: theme.typography.fontWeight.semibold
  },
  headerText: { ...sharedStyles.tableHeaderText },
  statusDot: { ...sharedStyles.statusDot },
  statusText: { ...sharedStyles.statusText },
  emptyText: { ...sharedStyles.emptyText }
});

const STATUS_COLORS = {
  PENDING: theme.colors.status.warning,
  COUNTING_ON: theme.colors.secondary,
  APPROVED: theme.colors.primary,
  PAID: theme.colors.status.confirmed,
  REJECTED: theme.colors.status.error
};

const SupplierCostsSection = ({ costs, t }) => {
  const { currency, byStatus, committedTotal, ranking } = costs;

  if (!ranking.length) {
    return (
      <View style={styles.section} wrap={false}>
        <SectionTitle>{t('eventReport.costs.title', 'Supplier Costs')}</SectionTitle>
        <Text style={styles.emptyText}>
          {t('eventReport.costs.noSuppliers', 'No suppliers associated with this event.')}
        </Text>
      </View>
    );
  }

  const statusLabel = (status) => t(`eventReport.costs.status.${status.toLowerCase()}`, status);

  return (
    <View style={styles.section} wrap={false}>
      <SectionTitle>{t('eventReport.costs.title', 'Supplier Costs')}</SectionTitle>

      <View style={styles.content}>
        <Text style={styles.paragraph}>
          {t('eventReport.costs.text.committedPrefix', 'The total committed investment in suppliers was')}{' '}
          <Text style={styles.highlight}>{formatCurrency(committedTotal, currency)}</Text>.
        </Text>

        {byStatus.PAID > 0 && (
          <Text style={styles.paragraph}>
            {t('eventReport.costs.text.paidPrefix', 'Of that amount,')}{' '}
            <Text style={styles.highlight}>{formatCurrency(byStatus.PAID, currency)}</Text>{' '}
            {t('eventReport.costs.text.paidSuffix', 'has already been paid.')}
          </Text>
        )}

        {byStatus.APPROVED > 0 && (
          <Text style={styles.paragraph}>
            <Text style={styles.highlight}>{formatCurrency(byStatus.APPROVED, currency)}</Text>{' '}
            {t('eventReport.costs.text.approvedSuffix', 'is approved and still to be paid.')}
          </Text>
        )}

        {byStatus.PENDING > 0 && (
          <Text style={styles.paragraph}>
            {t('eventReport.costs.text.pendingPrefix', 'There is still')}{' '}
            <Text style={styles.highlight}>{formatCurrency(byStatus.PENDING, currency)}</Text>{' '}
            {t('eventReport.costs.text.pendingSuffix', 'awaiting approval.')}
          </Text>
        )}

        {byStatus.COUNTING_ON > 0 && (
          <Text style={styles.paragraph}>
            <Text style={styles.highlight}>{formatCurrency(byStatus.COUNTING_ON, currency)}</Text>{' '}
            {t('eventReport.costs.text.countingOnSuffix', 'belongs to suppliers counted on without a formally approved quote.')}
          </Text>
        )}

        {byStatus.REJECTED > 0 && (
          <Text>
            <Text style={styles.highlight}>{formatCurrency(byStatus.REJECTED, currency)}</Text>{' '}
            {t('eventReport.costs.text.rejectedSuffix', 'in supplier quotes were rejected.')}
          </Text>
        )}
      </View>

      <Text style={styles.rankingTitle}>{t('eventReport.costs.ranking.title', 'Suppliers by Amount')}</Text>

      <View style={styles.tableWrapper} wrap={false}>
        <View style={styles.headerRow}>
          <Text style={[styles.nameCol, styles.headerText]}>
            {t('eventReport.costs.ranking.table.headers.supplier', 'Supplier')}
          </Text>
          <Text style={[styles.categoryCol, styles.headerText]}>
            {t('eventReport.costs.ranking.table.headers.category', 'Category')}
          </Text>
          <Text style={[styles.statusCol, styles.headerText]}>
            {t('eventReport.costs.ranking.table.headers.status', 'Status')}
          </Text>
          <Text style={[styles.amountCol, styles.headerText]}>
            {t('eventReport.costs.ranking.table.headers.amount', 'Amount')}
          </Text>
        </View>

        <View wrap={false}>
          {ranking.map((item, index) => (
            <View key={`${item.name}-${index}`} style={[
              styles.row,
              index % 2 === 1 && styles.rowAlt,
              index === ranking.length - 1 && styles.lastRow
            ]}>
              <Text style={styles.nameCol}>{item.name}</Text>
              <Text style={styles.categoryCol}>{item.category}</Text>
              <View style={styles.statusCol}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] || theme.colors.text.light }]} />
                <Text style={styles.statusText}>{statusLabel(item.status)}</Text>
              </View>
              <Text style={styles.amountCol}>{formatCurrency(item.amount, currency)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

SupplierCostsSection.propTypes = {
  costs: PropTypes.shape({
    currency: PropTypes.string,
    byStatus: PropTypes.shape({
      PENDING: PropTypes.number,
      COUNTING_ON: PropTypes.number,
      APPROVED: PropTypes.number,
      PAID: PropTypes.number,
      REJECTED: PropTypes.number
    }).isRequired,
    committedTotal: PropTypes.number.isRequired,
    ranking: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      category: PropTypes.string,
      status: PropTypes.string,
      amount: PropTypes.number
    })).isRequired
  }).isRequired,
  t: PropTypes.func.isRequired
};

export default SupplierCostsSection;
