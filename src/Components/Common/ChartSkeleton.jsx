import PropTypes from 'prop-types';

const ChartSkeleton = ({ type = 'default' }) => {
  const skeletons = {
    pie: (
      <div className="animate-pulse flex flex-col items-center w-full h-[300px]">
        <div className="w-48 h-48 rounded-full bg-muted mb-4" />
        <div className="flex flex-col gap-2 w-48">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-muted rounded w-full" />
          ))}
        </div>
      </div>
    ),
    
    bar: (
      <div className="animate-pulse flex items-end justify-between w-full h-[300px] px-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} 
            className="w-12 bg-muted rounded-t"
            style={{ height: `${Math.random() * 60 + 40}%` }} 
          />
        ))}
      </div>
    ),

    gauge: (
      <div className="animate-pulse flex flex-col items-center w-full h-[300px]">
        <div className="w-48 h-24 rounded-t-full bg-muted mb-4" />
        <div className="w-32 h-6 bg-muted rounded" />
      </div>
    ),

    line: (
      <div className="animate-pulse flex items-center w-full h-[300px] px-4">
        <div className="w-full h-48 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-1 bg-muted" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} 
              className="absolute w-3 h-3 rounded-full bg-muted"
              style={{ 
                left: `${(i-1) * 25}%`, 
                top: `${Math.random() * 80 + 10}%` 
              }} 
            />
          ))}
        </div>
      </div>
    )
  };

  return (
    <div className="w-full bg-card rounded-lg p-4 shadow-sm">
      <div className="flex items-center mb-4">
        <div className="w-32 h-6 bg-muted rounded animate-pulse" />
      </div>
      {skeletons[type] || skeletons.bar}
    </div>
  );
};

ChartSkeleton.propTypes = {
  type: PropTypes.string,
};

export default ChartSkeleton;