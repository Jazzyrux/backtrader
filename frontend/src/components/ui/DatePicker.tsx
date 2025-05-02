import React from 'react';
import { Input } from './Input';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder,
  className = ''
}) => {
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    if (!isNaN(date.getTime())) {
      onChange(date);
    }
  };

  return (
    <Input
      type="date"
      value={formatDate(value)}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}; 