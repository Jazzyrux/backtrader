import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import type { OHLCV, Position, Strategy } from '@/types/trading';
import { getStrategies, getStrategy } from '@/services/strategies';
import { formatPrice, formatPercent } from '@/utils/format';

interface StrategyTesterProps {
  symbol: string;
  data: OHLCV[];
  onPositionUpdate?: (position: Position | null) => void;
}

export const StrategyTester: React.FC<StrategyTesterProps> = ({
  symbol,
  data,
  onPositionUpdate
}) => {
  const strategies = getStrategies();
  const [selectedStrategy, setSelectedStrategy] = useState(strategies[0]?.id);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [signals, setSignals] = useState<Array<{
    timestamp: number;
    signal: string;
    price: number;
  }>>([]);

  useEffect(() => {
    if (!selectedStrategy || data.length < 50) return;

    const strategy = getStrategy(selectedStrategy);
    if (!strategy) return;

    const result = strategy.execute(data, currentPosition);
    
    if (result.signal !== 'hold') {
      setSignals(prev => [...prev, {
        timestamp: data[data.length - 1].timestamp,
        signal: result.signal,
        price: result.price || data[data.length - 1].close
      }]);

      if (result.signal === 'buy' && !currentPosition) {
        const newPosition: Position = {
          symbol,
          side: 'LONG',
          entryPrice: result.price || data[data.length - 1].close,
          quantity: 1,
          unrealizedPnL: 0,
          timestamp: data[data.length - 1].timestamp
        };
        setCurrentPosition(newPosition);
        onPositionUpdate?.(newPosition);
      } else if (result.signal === 'sell' && currentPosition) {
        setCurrentPosition(null);
        onPositionUpdate?.(null);
      }
    }
  }, [data, selectedStrategy, currentPosition, symbol, onPositionUpdate]);

  const handleStrategyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStrategy(event.target.value);
    setCurrentPosition(null);
    setSignals([]);
    onPositionUpdate?.(null);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Stratégie</label>
          <select
            className="w-full p-2 bg-gray-700 rounded border border-gray-600"
            value={selectedStrategy}
            onChange={handleStrategyChange}
          >
            {strategies.map((strategy: Strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.name}
              </option>
            ))}
          </select>
        </div>

        {currentPosition && (
          <div className="bg-gray-700 p-4 rounded">
            <h3 className="font-medium mb-2">Position Actuelle</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Type:</span>
                <span className="ml-2">{currentPosition.side}</span>
              </div>
              <div>
                <span className="text-gray-400">Prix d'entrée:</span>
                <span className="ml-2">{formatPrice(currentPosition.entryPrice)}</span>
              </div>
              <div>
                <span className="text-gray-400">Quantité:</span>
                <span className="ml-2">{currentPosition.quantity}</span>
              </div>
              <div>
                <span className="text-gray-400">PnL:</span>
                <span className={`ml-2 ${currentPosition.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatPercent(currentPosition.unrealizedPnL)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="font-medium mb-2">Derniers Signaux</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {signals.slice(-5).reverse().map((signal, index) => (
              <div key={index} className="text-sm bg-gray-700 p-2 rounded">
                <span className={signal.signal === 'buy' ? 'text-green-500' : 'text-red-500'}>
                  {signal.signal.toUpperCase()}
                </span>
                <span className="mx-2">@</span>
                <span>{formatPrice(signal.price)}</span>
                <span className="text-gray-400 ml-2">
                  {new Date(signal.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}; 