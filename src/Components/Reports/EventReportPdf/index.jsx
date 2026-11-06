import { Document } from '@react-pdf/renderer';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { PdfTemplate } from './components/PdfTemplate';
import ExecutiveSummary from './components/ExecutiveSummary';
import MetricsSection from './components/MetricsSection';
import PerformanceMetrics from './components/PerformanceMetrics';
import DistributionSection from './components/DistributionSection';
import EventOverview from './components/EventOverview';
import SupplierCostsSection from './components/SupplierCostsSection';
import ParticipantListSection from './components/ParticipantListSection';
import { formatDate } from './utils/formatters';

const EventReportPdf = ({ data }) => {
  const { t } = useTranslation('report');

  if (!data?.metrics) return null;

  const { metrics, raw, participantList } = data;
  const { event } = raw;

  return (
    <Document>
      <PdfTemplate
        title={t('eventReport.title')}
        subtitle={`${event.eventTitle}`}
        date={formatDate(new Date())}
        t={t}
      >
        <ExecutiveSummary 
          event={event}
          metrics={metrics}
          t={t}
        />

        <EventOverview 
          event={event}
          t={t}
        />
        <DistributionSection 
          distribution={metrics.distribution.byStatus}
          totalParticipants={metrics.general.totalParticipants}
          t={t}
        />

        <MetricsSection 
          metrics={metrics}
          t={t}
        />
        <PerformanceMetrics
          metrics={metrics}
          t={t}
        />
        <SupplierCostsSection
          costs={metrics.costs}
          t={t}
        />
        {participantList && (
          <ParticipantListSection
            participants={participantList}
            t={t}
          />
        )}
      </PdfTemplate>
    </Document>
  );
};

EventReportPdf.propTypes = {
  data: PropTypes.shape({
    metrics: PropTypes.shape({
      general: PropTypes.shape({
        totalParticipants: PropTypes.number,
        totalPresent: PropTypes.number,
        confirmedCount: PropTypes.number,
        canceledCount: PropTypes.number,
        dependentsCount: PropTypes.number
      }),
      distribution: PropTypes.shape({
        byStatus: PropTypes.arrayOf(PropTypes.shape({
          name: PropTypes.string,
          value: PropTypes.number
        }))
      }),
      performance: PropTypes.object,
      costs: PropTypes.shape({
        currency: PropTypes.string,
        byStatus: PropTypes.object,
        committedTotal: PropTypes.number,
        ranking: PropTypes.array
      })
    }),
    raw: PropTypes.shape({
      event: PropTypes.shape({
        eventTitle: PropTypes.string,
        eventDateType: PropTypes.string,
        eventStartDate: PropTypes.string,
        eventEndDate: PropTypes.string,
        eventSpecificDates: PropTypes.arrayOf(PropTypes.string),
        eventTime: PropTypes.string,
        eventLocation: PropTypes.string,
        eventCategory: PropTypes.string
      }),
      participants: PropTypes.array,
      dependents: PropTypes.array,
      eventSuppliers: PropTypes.array
    }),
    participantList: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      status: PropTypes.string,
      role: PropTypes.string,
      email: PropTypes.string,
      phone: PropTypes.string,
      dependents: PropTypes.arrayOf(PropTypes.string)
    }))
  }).isRequired
};

export default EventReportPdf;
