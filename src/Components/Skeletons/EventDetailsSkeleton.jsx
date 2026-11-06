import { Card } from '../UI'; // Path relative to new location (src/Components/Skeletons)

const EventDetailsSkeleton = () => {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {/* Skeleton for HeaderWithButton */}
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted rounded"></div>
          <div className="h-4 w-80 bg-muted rounded"></div>
        </div>
        <div className="h-10 w-24 bg-muted rounded-md"></div>
      </div>

      {/* Skeleton for Key Details Grid */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 border border-border bg-card rounded-lg shadow-sm">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-16 bg-muted rounded"></div>
            <div className="h-5 w-24 bg-muted rounded"></div>
          </div>
        ))}
      </div>

      {/* Skeleton for EventDetailsCard */}
      <Card variant="default" padded="md" elevated className="mb-4">
        <div className="space-y-4">
          <div className="h-5 w-1/3 bg-muted rounded mb-4"></div>
          <div className="h-4 w-full bg-muted rounded"></div>
          <div className="h-4 w-5/6 bg-muted rounded"></div>
          <div className="h-4 w-1/2 bg-muted rounded mt-4"></div>
          <div className="h-4 w-3/4 bg-muted rounded"></div>
        </div>
      </Card>

      {/* Skeleton for Tab Navigation */}
      <div className="flex space-x-1 border-b border-border mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-4 py-2 h-10 w-28 bg-muted rounded-t-md"></div>
        ))}
        <div className="flex-grow border-b border-border"></div>
      </div>

      {/* Skeleton for Tab Content Area */}
      <Card variant="default" padded="md" elevated>
        <div className="space-y-4">
          <div className="h-6 w-48 bg-muted rounded mb-4"></div>
          <div className="h-4 w-full bg-muted rounded"></div>
          <div className="h-4 w-full bg-muted rounded"></div>
          <div className="h-4 w-3/4 bg-muted rounded"></div>
        </div>
      </Card>

    </div>
  );
};

EventDetailsSkeleton.displayName = 'EventDetailsSkeleton';

export default EventDetailsSkeleton; 