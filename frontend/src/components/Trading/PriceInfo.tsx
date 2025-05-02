import React from 'react';
import { formatPrice, formatPercent } from '@/utils/format';

interface PriceInfoProps {
  lastPrice: number;
  priceChange: number;
  timeframe: string;
}

export const PriceInfo: React.FC<PriceInfoProps> = ({ 
  lastPrice = 0, 
  priceChange = 0, 
  timeframe 
}) => {
  const timeframeLabel = {
    '1m': 'Last minute',
    '5m': 'Last 5 minutes',
    '15m': 'Last 15 minutes',
    '30m': 'Last 30 minutes',
    '1h': 'Last hour',
    '4h': 'Last 4 hours',
    '1d': 'Last 24 hours',
    '1w': 'Last week',
  }[timeframe] || 'Price Change';

  return (
    <div className="flex space-x-4">
      <div className="bg-gray-800 p-4 rounded-lg flex-1">
        <h3 className="text-gray-400 text-sm">Last Price</h3>
        <p className="text-2xl font-bold">${formatPrice(lastPrice)}</p>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg flex-1">
        <h3 className="text-gray-400 text-sm">{timeframeLabel}</h3>
        <p className={`text-2xl font-bold ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {formatPercent(priceChange)}
        </p>
      </div>
    </div>
  );
}; 