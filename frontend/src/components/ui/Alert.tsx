import React from 'react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  className = ''
}) => {
  const variantStyles = {
    info: 'bg-blue-900/20 border-blue-500 text-blue-500',
    success: 'bg-green-900/20 border-green-500 text-green-500',
    warning: 'bg-yellow-900/20 border-yellow-500 text-yellow-500',
    error: 'bg-red-900/20 border-red-500 text-red-500'
  };

  return (
    <div className={`p-4 border rounded-md ${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  );
}; 