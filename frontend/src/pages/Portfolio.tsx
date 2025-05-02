import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StrategyPanel } from '@/components/Strategy/StrategyPanel';
import type { Strategy } from '@/types/trading';

interface Position {
  symbol: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  strategy: Strategy | null;
}

export const Portfolio = () => {
  const [positions] = useState<Position[]>([
    {
      symbol: 'BTC/USDT',
      amount: 0.5,
      entryPrice: 45000,
      currentPrice: 47000,
      strategy: null
    },
    {
      symbol: 'ETH/USDT',
      amount: 5,
      entryPrice: 3000,
      currentPrice: 3200,
      strategy: null
    }
  ]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="heading-1">Portfolio</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="heading-2">Positions</h2>
            <div className="space-y-4">
              {positions.map((position) => {
                const pnl = (position.currentPrice - position.entryPrice) * position.amount;
                const pnlPercentage = ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100;
                
                return (
                  <Link
                    key={position.symbol}
                    to={`/coins/${encodeURIComponent(position.symbol)}`}
                    className="block bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold">{position.symbol}</h3>
                        <p className="text-gray-400">
                          {position.amount} units @ ${position.entryPrice}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${(position.amount * position.currentPrice).toFixed(2)}</p>
                        <p className={pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} USD ({pnlPercentage.toFixed(2)}%)
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <StrategyPanel />
        </div>
      </div>
    </div>
  );
}; 