// Import necessary dependencies
import { lazy, Suspense } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import HeaderWithButton from "../HeaderWithButton";
import BillingGateNotice from "../Common/BillingGateNotice";
import { useEventsList } from "../../Hook/useEventsList";
import { useCreateEventGate } from "../../Hook/useCreateEventGate";
import { EventCardSkeleton } from "../Skeletons";

// Lazy load components
const EventList = lazy(() => import('../Event/EventList'));

const SkeletonGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {[...Array(8)].map((_, index) => (
      <EventCardSkeleton key={index} />
    ))}
  </div>
);

const EventsPage = () => {
  const { t } = useTranslation(['event', 'common']);
  const { allEvents, isLoading, error } = useEventsList();
  const user = useSelector((state) => state.user.user);
  const { gateReason, handleCreateEventClick } = useCreateEventGate();

  return (
    <div className="flex flex-col animate-fade-in">
      {/* Header Section */}
      <HeaderWithButton
        title={t('event:pages.events.welcome', { name: user?.name })}
        paragraph={t('event:pages.events.description')}
        buttonText={t('event:buttons.create')}
        onButtonClick={handleCreateEventClick}
        type="create"
      />

      {gateReason && (
        <div className="mb-4">
          <BillingGateNotice reason={gateReason} />
        </div>
      )}

      {/* Content Section */}
      <div>
        {isLoading ? (
          <SkeletonGrid />
        ) : error ? (
          <div className="text-center p-6 bg-card rounded-lg shadow-card">
            <p className="text-error font-medium">
              {t('event:feedback.error.message')}: {error.message}
            </p>
          </div>
        ) : (
          <Suspense fallback={<SkeletonGrid />}>
            <EventList events={allEvents} />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default EventsPage;