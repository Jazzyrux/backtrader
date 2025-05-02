interface DateRangePickerProps {
  value: [Date, Date] | null;
  onChange: (range: [Date, Date] | null) => void;
}

export const DateRangePicker = ({ value, onChange }: DateRangePickerProps) => {
  return (
    <div className="flex space-x-4">
      <input
        type="date"
        className="input"
        value={value?.[0]?.toISOString().split('T')[0] || ''}
        onChange={(e) => {
          const start = new Date(e.target.value);
          onChange(value ? [start, value[1]] : [start, start]);
        }}
      />
      <input
        type="date"
        className="input"
        value={value?.[1]?.toISOString().split('T')[0] || ''}
        onChange={(e) => {
          const end = new Date(e.target.value);
          onChange(value ? [value[0], end] : [end, end]);
        }}
      />
    </div>
  );
}; 