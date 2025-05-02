import { useState } from 'react';
import { LiveTrading } from './LiveTrading';

export const TradingPanel = () => {
  const [selectedPair] = useState('BTC/USDT');

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <LiveTrading symbol={selectedPair} />
    </div>
  );
}; 