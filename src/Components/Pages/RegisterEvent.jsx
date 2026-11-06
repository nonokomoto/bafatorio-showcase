import { lazy, Suspense } from 'react';
import Spinner from '../UI/spinner';

const EventForm = lazy(() => import('../Event/EventForm'));

/**
 * Event registration page component
 * O gate de criação de eventos é autoridade da Lambda (§4b do modelo canónico).
 */
const RegisterEventPage = () => {
  return (
    <Suspense fallback={<Spinner status="loading" />}>
      <EventForm />
    </Suspense>
  );
};

export default RegisterEventPage; 