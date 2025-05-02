import React from 'react';

interface SlicerProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const Slicer: React.FC<SlicerProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1
}) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm text-gray-400">{label}</label>
        <span className="text-sm font-medium">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="
          w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
          range-lg dark:bg-gray-700
        "
      />
    </div>
  );
};