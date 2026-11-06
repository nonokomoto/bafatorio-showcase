import { View, Text, StyleSheet } from '@react-pdf/renderer';
import PropTypes from 'prop-types';
import { sharedStyles } from './shared/styles';
import SectionTitle from './shared/SectionTitle';
import { formatPercentage } from '../utils/formatters';

const styles = StyleSheet.create({
  section: { ...sharedStyles.section },
  content: { ...sharedStyles.content },
  highlight: { ...sharedStyles.highlight },
  paragraph: { ...sharedStyles.paragraph }
});

const PerformanceMetrics = ({ metrics, t }) => {
  // As taxas chegam como string de processReportData ("55.2"); os guardas
  // abaixo comparam-nas com zero, por isso passam por Number primeiro.
  const asNumber = (value) => Number(value) || 0;

  const attendanceRate = asNumber(metrics.performance.attendanceRate);
  const cancellationRate = asNumber(metrics.rates?.cancellationRate);
  const dependentsRate = asNumber(metrics.performance.dependentsRate);
  const averageDependents = asNumber(metrics.performance.averageDependents);

  return (
    <View style={styles.section} wrap={false}>
      <SectionTitle>{t('eventReport.performance.title', 'Performance Indicators')}</SectionTitle>

      <View style={styles.content}>
        <Text style={styles.paragraph}>
          {t('eventReport.performance.text.attendancePrefix', 'The attendance rate was')}{' '}
          <Text style={styles.highlight}>{formatPercentage(attendanceRate)}</Text>
          {cancellationRate > 0 ? (
            <>
              , {t('eventReport.performance.text.cancellationPrefix', 'with a cancellation rate of')}{' '}
              <Text style={styles.highlight}>{formatPercentage(cancellationRate)}</Text>
            </>
          ) : null}.
        </Text>

        {dependentsRate > 0 && (
          <Text>
            <Text style={styles.highlight}>{formatPercentage(dependentsRate)}</Text>{' '}
            {t('eventReport.performance.text.dependentsMiddle', 'of participants brought accompanying guests, with an average of')}{' '}
            <Text style={styles.highlight}>{averageDependents.toFixed(1)}</Text>{' '}
            {t('eventReport.performance.text.dependentsSuffix', 'accompanying guests per participant.')}
          </Text>
        )}
      </View>
    </View>
  );
};

PerformanceMetrics.propTypes = {
  metrics: PropTypes.shape({
    performance: PropTypes.shape({
      attendanceRate: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      dependentsRate: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      averageDependents: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    }).isRequired,
    rates: PropTypes.shape({
      cancellationRate: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    })
  }).isRequired,
  t: PropTypes.func.isRequired
};

export default PerformanceMetrics;
