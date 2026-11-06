import { View, Text, StyleSheet } from '@react-pdf/renderer';
import PropTypes from 'prop-types';
import { formatEventDateDisplay } from '../../../../Utils/formatDate';
import SectionTitle from './shared/SectionTitle';
import { formatCurrency } from '../utils/formatters';
import { sharedStyles } from './shared/styles';

const styles = StyleSheet.create({
  section: { ...sharedStyles.section, break: 'avoid' },
  content: { ...sharedStyles.content },
  highlight: { ...sharedStyles.highlight },
  paragraph: { ...sharedStyles.paragraph }
});

// Helper function to render text with highlighted parts
const renderHighlightedText = (textKey, values, styles, t) => {
  // This approach uses the structure of our text to determine where to place highlights
  // Each component has its own rendering logic based on the specific text structure
  
  switch(textKey) {
    case 'eventInfo':
      return (
        <Text style={styles.paragraph}>
          {t('eventReport.executiveSummary.eventInfo.prefix')}{' '}
          <Text style={styles.highlight}>{values.eventTitle}</Text>{' '}
          {t('eventReport.executiveSummary.eventInfo.location')}{' '}
          <Text style={styles.highlight}>{values.eventLocation}</Text>{' '}
          {t('eventReport.executiveSummary.eventInfo.date')}{' '}
          <Text style={styles.highlight}>{values.eventDateDisplay}</Text>.
        </Text>
      );
    case 'attendance':
      return (
        <Text style={styles.paragraph}>
          {t('eventReport.executiveSummary.attendance.prefix')}{' '}
          <Text style={styles.highlight}>{values.totalParticipants}</Text>{' '}
          {t('eventReport.executiveSummary.attendance.registered')},{' '}
          <Text style={styles.highlight}>{values.confirmedCount}</Text>{' '}
          {t('eventReport.executiveSummary.attendance.confirmed')}{' '}
          (<Text style={styles.highlight}>{values.attendanceRate}%</Text>{' '}
          {t('eventReport.executiveSummary.attendance.rate')}).
        </Text>
      );
    case 'topCategory':
      return (
        <Text style={styles.paragraph}>
          {t('eventReport.executiveSummary.topCategory.prefix')}{' '}
          <Text style={styles.highlight}>{values.categoryName}</Text>
          {t('eventReport.executiveSummary.topCategory.withCount')}{' '}
          <Text style={styles.highlight}>{values.categoryCount}</Text>{' '}
          {t('eventReport.executiveSummary.topCategory.participants')}{' '}
          (<Text style={styles.highlight}>{values.categoryRate}%</Text>{' '}
          {t('eventReport.executiveSummary.topCategory.ofTotal')}).
        </Text>
      );
    case 'dependents':
      return (
        <Text style={styles.paragraph}>
          {t('eventReport.executiveSummary.dependents.prefix')}{' '}
          <Text style={styles.highlight}>{values.dependentsCount}</Text>{' '}
          {t('eventReport.executiveSummary.dependents.suffix')}.
        </Text>
      );
    case 'totalPresent':
      return (
        <Text style={styles.paragraph}>
          {t('eventReport.executiveSummary.totalPresent.prefix')}{' '}
          <Text style={styles.highlight}>{values.totalPresent}</Text>{' '}
          {t('eventReport.executiveSummary.totalPresent.people')}.
        </Text>
      );
    case 'cancellations':
      return (
        <Text style={styles.paragraph}>
          {t('eventReport.executiveSummary.cancellations.prefix')}{' '}
          <Text style={styles.highlight}>{values.canceledCount}</Text>{' '}
          {t('eventReport.executiveSummary.cancellations.suffix')}.
        </Text>
      );
    case 'costs':
      return (
        <Text style={styles.paragraph}>
          {t('eventReport.executiveSummary.costs.prefix')}{' '}
          <Text style={styles.highlight}>{values.committedTotal}</Text>
          {values.paidTotal ? (
            <>
              , {t('eventReport.executiveSummary.costs.paidPrefix')}{' '}
              <Text style={styles.highlight}>{values.paidTotal}</Text>{' '}
              {t('eventReport.executiveSummary.costs.paidSuffix')}
            </>
          ) : null}.
        </Text>
      );
    default:
      return null;
  }
};

const ExecutiveSummary = ({ event, metrics, t }) => {
  // Recalcular aqui dividia por zero num evento concluído sem inscritos e
  // imprimia "NaN%"; processReportData já devolve a taxa com essa guarda.
  const attendanceRate = metrics.rates.confirmationRate;
  const { topCategory } = metrics.general;

  return (
    <View style={styles.section}>
      <SectionTitle>{t('eventReport.executiveSummary.title')}</SectionTitle>
      
      <View style={styles.content}>
        {renderHighlightedText('eventInfo', {
          eventTitle: event.eventTitle,
          eventLocation: event.eventLocation,
          eventDateDisplay: formatEventDateDisplay(event)
        }, styles, t)}

        {renderHighlightedText('attendance', {
          totalParticipants: metrics.general.totalParticipants,
          confirmedCount: metrics.general.confirmedCount,
          attendanceRate: attendanceRate
        }, styles, t)}

        {metrics.general.canceledCount > 0 && renderHighlightedText('cancellations', {
          canceledCount: metrics.general.canceledCount
        }, styles, t)}

        {topCategory && renderHighlightedText('topCategory', {
          categoryName: topCategory.name,
          categoryCount: topCategory.value,
          categoryRate: ((topCategory.value / metrics.general.totalParticipants) * 100).toFixed(1)
        }, styles, t)}

        {metrics.general.dependentsCount > 0 && 
          renderHighlightedText('dependents', {
            dependentsCount: metrics.general.dependentsCount
          }, styles, t)
        }

        {metrics.general.totalPresent > 0 &&
          renderHighlightedText('totalPresent', {
            totalPresent: metrics.general.totalPresent
          }, styles, t)
        }

        {metrics.costs?.ranking?.length > 0 && renderHighlightedText('costs', {
          committedTotal: formatCurrency(metrics.costs.committedTotal, metrics.costs.currency),
          paidTotal: metrics.costs.byStatus.PAID > 0
            ? formatCurrency(metrics.costs.byStatus.PAID, metrics.costs.currency)
            : null
        }, styles, t)}

        {event.description && (
          <Text style={styles.paragraph}>
            {event.description}
          </Text>
        )}

        <Text>
          {t('eventReport.executiveSummary.conclusion')}
        </Text>
      </View>
    </View>
  );
};

ExecutiveSummary.propTypes = {
  event: PropTypes.shape({
    eventTitle: PropTypes.string,
    eventLocation: PropTypes.string,
    eventDateType: PropTypes.string,
    eventStartDate: PropTypes.string,
    eventEndDate: PropTypes.string,
    eventSpecificDates: PropTypes.arrayOf(PropTypes.string),
    description: PropTypes.string
  }).isRequired,
  metrics: PropTypes.shape({
    rates: PropTypes.shape({
      confirmationRate: PropTypes.string
    }).isRequired,
    general: PropTypes.shape({
      totalParticipants: PropTypes.number,
      confirmedCount: PropTypes.number,
      canceledCount: PropTypes.number,
      // A categoria mais representada do evento; null se ninguém tiver role.
      topCategory: PropTypes.shape({
        name: PropTypes.string.isRequired,
        value: PropTypes.number.isRequired
      }),
      dependentsCount: PropTypes.number,
      totalPresent: PropTypes.number
    }).isRequired,
    costs: PropTypes.shape({
      currency: PropTypes.string,
      byStatus: PropTypes.object,
      committedTotal: PropTypes.number,
      ranking: PropTypes.array
    })
  }).isRequired,
  t: PropTypes.func.isRequired
};

export default ExecutiveSummary;
