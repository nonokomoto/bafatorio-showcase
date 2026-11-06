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

const EventOverview = ({ event, t }) => {
  const notAvailable = t('eventReport.formatters.notAvailable', 'Not available');
  // eventType é o tipo de ACESSO (público/privado), não a categoria — essas são
  // as `categories` do parágrafo seguinte. A copy vive no namespace do
  // formulário, que é quem a define; duplicá-la aqui era abrir duas fontes.
  const accessLabel = event.eventType
    ? t(`event:eventForm.accessTypes.${event.eventType}`, notAvailable)
    : notAvailable;
  const organizer = event.eventManager || notAvailable;
  const email = event.eventManagerEmail || notAvailable;
  const phone = event.eventManagerPhone || notAvailable;
  const categoriesTags = event.categories?.length ? event.categories.join(', ') : null;

  return (
    <View style={styles.section} wrap={false}>
      <SectionTitle>{t('eventReport.eventOverview.title', 'Event Overview')}</SectionTitle>

      <View style={styles.content}>
        <Text style={styles.paragraph}>
          {t('eventReport.eventOverview.text.accessPrefix', 'This event is classified as')}{' '}
          <Text style={styles.highlight}>{accessLabel}</Text>.{' '}
          {t('eventReport.eventOverview.text.organizerPrefix', 'The organizer is')}{' '}
          <Text style={styles.highlight}>{organizer}</Text>,{' '}
          {t('eventReport.eventOverview.text.contactMiddle', 'reachable by email at')}{' '}
          <Text style={styles.highlight}>{email}</Text>{' '}
          {t('eventReport.eventOverview.text.contactAnd', 'and by phone at')}{' '}
          <Text style={styles.highlight}>{phone}</Text>.
        </Text>

        {categoriesTags && (
          <Text>
            {t('eventReport.eventOverview.text.categoriesPrefix', 'The categories associated with this event include')}{' '}
            <Text style={styles.highlight}>{categoriesTags}</Text>.
          </Text>
        )}
      </View>
    </View>
  );
};

EventOverview.propTypes = {
  event: PropTypes.shape({
    eventTitle: PropTypes.string,
    eventDateType: PropTypes.string,
    eventStartDate: PropTypes.string,
    eventEndDate: PropTypes.string,
    eventSpecificDates: PropTypes.arrayOf(PropTypes.string),
    eventTime: PropTypes.string,
    eventLocation: PropTypes.string,
    eventType: PropTypes.string,
    eventManager: PropTypes.string,
    eventManagerEmail: PropTypes.string,
    eventManagerPhone: PropTypes.string,
    categories: PropTypes.arrayOf(PropTypes.string)
  }).isRequired,
  t: PropTypes.func.isRequired
};

export default EventOverview;
