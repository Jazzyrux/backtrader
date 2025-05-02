import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { binanceService } from '@/services/binance';
import { Loading } from '@/components/ui/Loading';
import { Card } from '@/components/ui/Card';
import type { Portfolio } from '@/types/trading';

export const Dashboard = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // À implémenter: récupération du portfolio depuis l'API
        const mockPortfolio: Portfolio = {
          totalValue: 10000,
          pnl24h: 2.5,
          positions: [
            {
              symbol: 'BTC/USDT',
              amount: 0.5,
              value: 5000,
              pnl24h: 3.2
            },
            {
              symbol: 'ETH/USDT',
              amount: 2,
              value: 3000,
              pnl24h: -1.5
            }
          ]
        };
        setPortfolio(mockPortfolio);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load portfolio');
      } finally {
        setIsLoading(false);
      }
    };

    loadPortfolio();
  }, []);

  if (isLoading) return <Loading />;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading-1">Dashboard</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="text-gray-400">Portfolio Value</h3>
          <p className="text-2xl font-bold">
            ${portfolio?.totalValue.toFixed(2) ?? '0.00'}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-gray-400">24h PnL</h3>
          <p className={`text-2xl font-bold ${(portfolio?.pnl24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {(portfolio?.pnl24h ?? 0) >= 0 ? '+' : ''}
            {(portfolio?.pnl24h ?? 0).toFixed(2)}%
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="heading-2 mb-4">Active Positions</h2>
        <div className="space-y-4">
          {portfolio?.positions.map((position) => (
            <Link
              key={position.symbol}
              to={`/trading/${position.symbol}`}
              className="block bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold">{position.symbol}</h3>
                  <p className="text-gray-400">{position.amount} units</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">${position.value.toFixed(2)}</p>
                  <p className={position.pnl24h >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {position.pnl24h >= 0 ? '+' : ''}{position.pnl24h.toFixed(2)}%
                  </p>
                </div>
              </div>
            </Link>
          ))}
          {!portfolio?.positions.length && (
            <div className="text-gray-400 text-center py-4">
              No active positions
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}; 