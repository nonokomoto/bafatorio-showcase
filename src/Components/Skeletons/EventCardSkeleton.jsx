import { Card } from '../UI'; // Path relative to new location (src/Components/Skeletons)

const EventCardSkeleton = () => {
  // Define widths for the skeleton info lines
  const infoLineWdths = ['w-1/2', 'w-2/3', 'w-1/3'];

  return (
    <Card 
      elevated="sm"
      className="animate-pulse border-t-4 border-border"
    >
      <div className="p-5">
        {/* Skeleton Header */}
        <div className="-m-5 mb-4 p-4 bg-muted">
          <div className="flex justify-between items-center">
            <div className="h-5 w-20 bg-muted rounded"></div>
            <div className="h-5 w-16 bg-muted rounded"></div>
          </div>
        </div>
        
        {/* Skeleton Title */}
        <div className="h-6 w-3/4 bg-muted rounded mb-4"></div>
        
        {/* Skeleton Info Lines (Simplified with map) */}
        <div className="space-y-3 mt-4">
          {infoLineWdths.map((width, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-4 h-4 bg-muted rounded-full flex-shrink-0"></div>
              <div className={`h-4 ${width} bg-muted rounded`}></div>
            </div>
          ))}
        </div>
        
        {/* Skeleton Actions */}
        <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
          <div className="h-8 w-20 bg-muted rounded"></div> {/* Placeholder for delete button */}
          <div className="h-4 w-24 bg-muted rounded"></div> {/* Placeholder for view details link */}
        </div>
      </div>
    </Card>
  );
};

// Add display name for better debugging
EventCardSkeleton.displayName = 'EventCardSkeleton';

export default EventCardSkeleton; 