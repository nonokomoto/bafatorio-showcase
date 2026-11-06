import { View, Text, StyleSheet } from '@react-pdf/renderer';
import PropTypes from 'prop-types';
import { theme } from '../theme';
import { sharedStyles } from './shared/styles';
import SectionTitle from './shared/SectionTitle';
import { SCHEDULE_COLORS } from '../../../../Utils/scheduleColors';

const styles = StyleSheet.create({
  section: {
    ...sharedStyles.section
  },
  tableWrapper: {
    ...sharedStyles.card,
    padding: 0,
    overflow: 'hidden'
  },
  headerRow: {
    ...sharedStyles.row,
    backgroundColor: theme.colors.background.light,
    padding: theme.spacing.md,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  row: {
    ...sharedStyles.row,
    padding: theme.spacing.md,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  rowAlt: {
    backgroundColor: theme.colors.background.default
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.light,
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background.dark
  },
  // Columns with specific widths
  categoryCol: {
    flex: 2,
    color: theme.colors.text.default,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.primary
  },
  numberCol: {
    flex: 1,
    textAlign: 'right',
    color: theme.colors.text.default,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.primary
  },
  percentageCol: {
    flex: 1,
    textAlign: 'right',
    color: theme.colors.text.default,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.primary
  },
  // Header styles
  headerText: { ...sharedStyles.tableHeaderText },
  // Bold text styles
  boldText: {
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: theme.typography.fontWeight.bold
  },
  // Status indicator styles
  statusIndicator: { ...sharedStyles.statusDot },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
});

// As categorias são as roles do evento, criadas pelo organizador: não há lista
// fixa a que se possa atribuir cores à mão. Reusa-se a paleta curada da agenda,
// que existe para o mesmo problema — colorir rótulos arbitrários sem tocar nas
// cores reservadas ao estado.
const UNCATEGORIZED_COLOR = theme.colors.border;

// A cor sai de um hash do nome, para que a mesma role saia igual entre
// relatórios; colisões avançam para a cor livre seguinte, senão duas
// categorias lado a lado ficavam com o mesmo ponto.
const assignColors = (categories) => {
  const usadas = new Set();
  return categories.map(({ name, isUncategorized }) => {
    if (isUncategorized) return UNCATEGORIZED_COLOR;
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
      hash = (hash * 31 + name.charCodeAt(i)) % 1000003;
    }
    for (let i = 0; i < SCHEDULE_COLORS.length; i += 1) {
      const cor = SCHEDULE_COLORS[(hash + i) % SCHEDULE_COLORS.length];
      if (!usadas.has(cor)) {
        usadas.add(cor);
        return cor;
      }
    }
    return SCHEDULE_COLORS[hash % SCHEDULE_COLORS.length];
  });
};

const DistributionSection = ({ distribution, totalParticipants, t }) => {
  const cores = assignColors(distribution);

  return (
    <View style={styles.section} wrap={false}>
      <SectionTitle>{t('eventReport.distribution.title', 'Distribution by Category')}</SectionTitle>
      
      <View style={styles.tableWrapper} wrap={false}>
        {/* Table Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.categoryCol, styles.headerText]}>
            {t('eventReport.distribution.table.headers.category', 'Category')}
          </Text>
          <Text style={[styles.numberCol, styles.headerText]}>
            {t('eventReport.distribution.table.headers.quantity', 'Quantity')}
          </Text>
          <Text style={[styles.percentageCol, styles.headerText]}>
            {t('eventReport.distribution.table.headers.percentage', 'Percentage')}
          </Text>
        </View>

        {/* Data Rows */}
        <View wrap={false}>
          {distribution.map(({ name, value }, index) => (
            <View key={index} style={[
              styles.row,
              index % 2 === 1 && styles.rowAlt,
              index === distribution.length - 1 && { borderBottomWidth: 0 }
            ]}>
              <View style={[styles.categoryCol, styles.statusRow]}>
                <View style={[styles.statusIndicator, { backgroundColor: cores[index] }]} />
                <Text>{name}</Text>
              </View>
              <Text style={styles.numberCol}>{value}</Text>
              <Text style={styles.percentageCol}>
                {((value / totalParticipants) * 100).toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>

        {/* Total Row */}
        <View style={styles.totalRow}>
          <Text style={[styles.categoryCol, styles.boldText]}>
            {t('eventReport.distribution.table.total', 'Total')}
          </Text>
          <Text style={[styles.numberCol, styles.boldText]}>{totalParticipants}</Text>
          <Text style={[styles.percentageCol, styles.boldText]}>100%</Text>
        </View>
      </View>
    </View>
  );
};

DistributionSection.propTypes = {
  distribution: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      isUncategorized: PropTypes.bool
    })
  ).isRequired,
  totalParticipants: PropTypes.number.isRequired,
  t: PropTypes.func.isRequired
};

export default DistributionSection;