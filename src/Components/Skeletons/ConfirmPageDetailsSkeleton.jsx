import { Card } from '../UI';

const ConfirmPageDetailsSkeleton = () => {
  return (
    <Card variant="default" elevated className="p-6 animate-pulse">
      <div className="space-y-4">
        {/* Placeholder for Title */}
        <div className="h-6 w-1/3 bg-muted rounded mb-4"></div>
        
        {/* Placeholder for Stats/Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="h-4 w-20 bg-muted rounded"></div>
              <div className="h-8 w-12 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

ConfirmPageDetailsSkeleton.displayName = 'ConfirmPageDetailsSkeleton';

export default ConfirmPageDetailsSkeleton; 