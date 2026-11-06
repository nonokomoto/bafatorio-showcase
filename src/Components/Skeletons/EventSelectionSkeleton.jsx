import PropTypes from 'prop-types';
import { Card } from '../UI';

const EventSelectionSkeleton = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-10 w-64 bg-muted rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-muted rounded-lg animate-pulse shrink-0" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-pulse">
      <Card variant="default" elevated className="p-6">
        {/* Skeleton Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex-1 space-y-2">
            <div className="h-6 w-1/2 bg-muted rounded"></div>
            <div className="h-4 w-3/4 bg-muted rounded"></div>
          </div>
          <div className="h-10 w-32 bg-muted rounded-md"></div>
        </div>

        {/* Skeleton Select Dropdown */}
        <div className="h-12 w-full bg-muted rounded-md"></div>
      </Card>
    </div>
  );
};

EventSelectionSkeleton.propTypes = {
  compact: PropTypes.bool,
};

EventSelectionSkeleton.displayName = 'EventSelectionSkeleton';

export default EventSelectionSkeleton;
