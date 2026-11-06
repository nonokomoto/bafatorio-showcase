import { View, Text, StyleSheet } from '@react-pdf/renderer';
import PropTypes from 'prop-types';
import { sharedStyles } from './shared/styles';
import SectionTitle from './shared/SectionTitle';

const styles = StyleSheet.create({
  section: { ...sharedStyles.section },
  content: { ...sharedStyles.content },
  highlight: { ...sharedStyles.highlight },
  paragraph: { ...sharedStyles.paragraph }
});

const MetricsSection = ({ metrics, t }) => {
  const { totalParticipants, confirmedCount, canceledCount, dependentsCount } = metrics.general;

  return (
    <View style={styles.section} wrap={false}>
      <SectionTitle>{t('eventReport.metrics.title', 'Key Metrics')}</SectionTitle>

      <View style={styles.content}>
        <Text style={styles.paragraph}>
          {t('eventReport.metrics.text.prefix', 'This event had')}{' '}
          <Text style={styles.highlight}>{totalParticipants}</Text>{' '}
          {t('eventReport.metrics.text.invited', 'invited participants')},{' '}
          {t('eventReport.metrics.text.confirmedPrefix', 'of whom')}{' '}
          <Text style={styles.highlight}>{confirmedCount}</Text>{' '}
          {t('eventReport.metrics.text.confirmed', 'confirmed attendance and')}{' '}
          <Text style={styles.highlight}>{canceledCount}</Text>{' '}
          {t('eventReport.metrics.text.canceled', 'canceled their participation.')}
        </Text>

        {dependentsCount > 0 && (
          <Text>
            {t('eventReport.metrics.text.dependentsPrefix', 'There were also')}{' '}
            <Text style={styles.highlight}>{dependentsCount}</Text>{' '}
            {t('eventReport.metrics.text.dependentsSuffix', 'accompanying guests registered.')}
          </Text>
        )}
      </View>
    </View>
  );
};

MetricsSection.propTypes = {
  metrics: PropTypes.shape({
    general: PropTypes.shape({
      totalParticipants: PropTypes.number.isRequired,
      confirmedCount: PropTypes.number.isRequired,
      canceledCount: PropTypes.number.isRequired,
      dependentsCount: PropTypes.number.isRequired
    }).isRequired
  }).isRequired,
  t: PropTypes.func.isRequired
};

export default MetricsSection;
