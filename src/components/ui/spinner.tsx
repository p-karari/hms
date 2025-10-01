import React from 'react';

// Define the props the Spinner component accepts
interface SpinnerProps {
  /** Size of the spinner, e.g., 'w-8 h-8'. Defaults to 'w-6 h-6'. */
  size?: string;
  /** Color class for the spinner border, e.g., 'border-blue-500'. Defaults to 'border-gray-400'. */
  color?: string;
  /** The color class for the spinner's outer ring. Defaults to 'border-t-transparent'. */
  ringColor?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'w-6 h-6', 
  color = 'border-blue-500', 
  ringColor = 'border-t-transparent' 
}) => {
  // Combine all necessary classes. The 'animate-spin' utility provides the rotation animation.
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
      {/* Hidden span for screen readers to convey the spinner's purpose */}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Spinner;