import React from 'react';

interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry }) => {
  return (
    <div className="p-4 bg-red-500 text-white rounded">
      <p className="mb-2">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-white text-red-500 rounded hover:bg-red-100"
        >
          Retry
        </button>
      )}
    </div>
  );
};
