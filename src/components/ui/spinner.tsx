import React from 'react';

interface SpinnerProps {
  size?: string;
  color?: string;
  ringColor?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'w-6 h-6', 
  color = 'border-blue-500', 
  ringColor = 'border-t-transparent' 
}) => {
  const spinnerClasses = [
    'inline-block',
    'rounded-full',
    'border-4', 
    size,
    color,
    ringColor, 
    'animate-spin'
  ].join(' ');

  return (
    <div 
      className={spinnerClasses}
      role="status" 
      aria-live="polite" 
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Spinner;