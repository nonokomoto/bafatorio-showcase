import { Card } from '../UI';

const SearchParticipantSkeleton = () => {
  const skeletonRows = 3;

  return (
    <Card variant="default" elevated className="p-6 animate-pulse">
      <div className="space-y-4">
        {/* Placeholder for Title/Header */}
        <div className="h-6 w-1/4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        
        {/* Placeholder for Search Input */}
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-md mb-6"></div>

        {/* Placeholder for Participant List/Table Header */}
        <div className="hidden md:flex justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
          <div className="h-4 w-1/4 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-4 w-1/4 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-4 w-1/6 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-4 w-1/6 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>

        {/* Placeholder for Participant Rows */}
        <div className="space-y-3">
          {[...Array(skeletonRows)].map((_, i) => (
            <div key={i} className="flex flex-col md:flex-row items-center justify-between p-4 border border-gray-100 dark:border-gray-700 rounded-lg">
              <div className="h-5 w-1/2 md:w-1/4 bg-gray-200 dark:bg-gray-700 rounded mb-2 md:mb-0"></div>
              <div className="h-4 w-3/4 md:w-1/4 bg-gray-200 dark:bg-gray-700 rounded mb-2 md:mb-0"></div>
              <div className="h-4 w-1/4 md:w-1/6 bg-gray-200 dark:bg-gray-700 rounded mb-2 md:mb-0"></div>
              <div className="h-8 w-24 md:w-1/6 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

SearchParticipantSkeleton.displayName = 'SearchParticipantSkeleton';

export default SearchParticipantSkeleton; 