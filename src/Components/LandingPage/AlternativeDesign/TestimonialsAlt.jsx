import PropTypes from 'prop-types';
import { FiCalendar } from 'react-icons/fi';
import { Text, Container, Card } from '../../UI';
import { useTranslation } from 'react-i18next';
import 'animate.css';

const EventCard = ({ name, detail, index }) => (
  <Card
    className="h-full animate__animated animate__fadeIn border-background-200 dark:border-background-700 hover:border-primary-200 dark:hover:border-primary-800 hover:shadow-lg transition-[border-color,box-shadow] duration-300"
    style={{ animationDelay: `${index * 0.08}s` }}
  >
    <div className="flex items-center p-6">
      <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center mr-4">
        <FiCalendar className="w-5 h-5" />
      </div>
      <div>
        <Text variant="subtitle2" weight="medium" className="text-text-800 dark:text-text-200">
          {name}
        </Text>
        <Text variant="caption" className="text-text-500 dark:text-text-400">
          {detail}
        </Text>
      </div>
    </div>
  </Card>
);

EventCard.propTypes = {
  name: PropTypes.string.isRequired,
  detail: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired
};

const TestimonialsAlt = () => {
  const { t } = useTranslation('landingPageAlt');
  const events = t('testimonials.items', { returnObjects: true });

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-primary-50/40 via-white to-secondary-50/30 dark:from-background-900 dark:via-background-800 dark:to-background-900 overflow-hidden">
      <Container>
        <div className="text-center mb-10 md:mb-14 animate__animated animate__fadeIn animate__faster">
          <Text variant="h2" weight="bold" className="mb-4 text-center animate__animated animate__fadeIn">
            {t('testimonials.title')} <span className="text-primary-600 dark:text-primary-400">{t('testimonials.titleHighlight')}</span>
          </Text>
          <Text variant="subtitle1" className="text-text-600 dark:text-text-300 max-w-2xl mx-auto text-center animate__animated animate__fadeIn">
            {t('testimonials.subtitle')}
          </Text>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 animate__animated animate__fadeIn" style={{ animationDelay: '0.2s' }}>
          {Array.isArray(events) && events.map((event, index) => (
            <EventCard
              key={event.name}
              name={event.name}
              detail={event.detail}
              index={index}
            />
          ))}
        </div>
      </Container>
    </section>
  );
};

export default TestimonialsAlt;
