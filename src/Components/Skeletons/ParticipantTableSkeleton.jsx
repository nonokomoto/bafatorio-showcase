import { Card } from '../UI'; // Path relative to new location (src/Components/Skeletons)

const ParticipantTableSkeleton = () => {
  const skeletonRows = 5; // Number of skeleton rows to display

  return (
    <Card 
      variant="default"
      padded="none" // Assuming table takes full width of card
      elevated
      className="animate-pulse overflow-hidden"
    >
      {/* Skeleton Header Controls (Optional, based on actual table) */}
      <div className="p-4 border-b border-border flex justify-between items-center">
        <div className="h-6 w-1/4 bg-muted rounded"></div>
        <div className="h-9 w-32 bg-muted rounded-md"></div>
      </div>

      {/* Skeleton Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              {/* Assuming 4-5 columns based on typical participant data */}
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="h-4 w-20 bg-muted rounded"></div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="h-4 w-24 bg-muted rounded"></div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="h-4 w-16 bg-muted rounded"></div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="h-4 w-12 bg-muted rounded"></div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="h-4 w-10 bg-muted rounded float-right"></div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {[...Array(skeletonRows)].map((_, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 w-32 bg-muted rounded"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 w-40 bg-muted rounded"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 w-20 bg-muted rounded"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 w-8 bg-muted rounded"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="h-6 w-16 bg-muted rounded float-right"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Skeleton Pagination (Optional, based on actual table) */}
      <div className="p-4 border-t border-border flex justify-between items-center">
        <div className="h-4 w-1/5 bg-muted rounded"></div>
        <div className="flex space-x-2">
          <div className="h-8 w-8 bg-muted rounded"></div>
          <div className="h-8 w-8 bg-muted rounded"></div>
        </div>
      </div>
    </Card>
  );
};

ParticipantTableSkeleton.displayName = 'ParticipantTableSkeleton';

export default ParticipantTableSkeleton; 