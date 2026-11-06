import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { useDashboardData } from '../Dashboard/hooks/useDashboardData.js';
import { FiLoader } from "react-icons/fi";
import Spinner from '../UI/spinner.jsx';
import 'animate.css';
import Text from '../UI/Text';
import PageHeader from '../UI/PageHeader';

const DashboardHeader = lazy(() => import('../Dashboard/DashboardHeader'));
const DashboardChart = lazy(() => import('../Dashboard/DashboardChart'));
const DashboardInsights = lazy(() => import('../Dashboard/DashboardInsights'));

const Dashboard = () => {
  const { t } = useTranslation('dashboard');
  const {
    headerMetrics,
    raw,
    isLoading,
    error
  } = useDashboardData();

  if (isLoading) return <Spinner status="loadingWithMessage" loadingMessage={t('loading.dashboard')} />;
  if (error) return <ErrorMessage message={error.message} />;

  // Features for the dashboard page
  const features = [
    {
      title: t('main.features.holisticView.title'),
      description: t('main.features.holisticView.description')
    },
    {
      title: t('main.features.realTimeAnalysis.title'),
      description: t('main.features.realTimeAnalysis.description')
    },
    {
      title: t('main.features.valuableInsights.title'),
      description: t('main.features.valuableInsights.description')
    }
  ];

  return (
    <div className="mx-auto space-y-8">
      <PageHeader
        title={t('main.title')}
        features={features}
        titleVariant="h4"
      />

      <Suspense fallback={<LoadingSpinner message={t('loading.summary')} />}>
        <div className="animate__animated animate__fadeIn">
          <DashboardHeader headerMetrics={headerMetrics} />
        </div>
      </Suspense>

      <Suspense fallback={<LoadingSpinner message={t('loading.insights')} />}>
        <div className="animate__animated animate__fadeIn">
          <DashboardInsights
            events={raw.events}
            participants={raw.participants}
          />
        </div>
      </Suspense>

      <Suspense fallback={<LoadingSpinner message={t('loading.charts')} />}>
        <div className="animate__animated animate__fadeIn">
          <DashboardChart
            events={raw.events}
            participants={raw.participants}
            dependents={raw.dependents}
            isLoading={isLoading}
          />
        </div>
      </Suspense>
    </div>
  );
};

const LoadingSpinner = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-48 text-center">
    <FiLoader className="h-6 w-6 animate-spin text-primary-500 mb-2" />
    <Text variant="body2" className="text-muted-foreground">{message}</Text>
  </div>
);

LoadingSpinner.propTypes = {
  message: PropTypes.string.isRequired
};

const ErrorMessage = ({ message }) => {
  const { t } = useTranslation('dashboard');
  
  return (
    <div className="border-l-2 border-error-500 pl-4 py-3 bg-error-50 dark:bg-transparent text-error-700 dark:text-error-400 my-4">
      <Text variant="h6" className="font-medium mb-1">{t('error.title')}</Text>
      <Text variant="body2" className="text-error-600 dark:text-error-400">{message}</Text>
    </div>
  );
};

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired
};

export default Dashboard;