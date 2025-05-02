import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TradingView } from '@/components/Trading/TradingView';
import { Card } from '@/components/ui/Card';
import type { OHLCV, OrderParams } from '@/types/trading';
import { binanceService } from '@/services/binance';
import { Button } from '@/components/ui/Button';

export const Trading = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const [data, setData] = useState<OHLCV[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!symbol) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const historicalData = await binanceService.getKlines(symbol, '1d');
        setData(historicalData);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [symbol]);

  const handleOrderSubmit = (order: OrderParams) => {
    console.log('Order submitted:', order);
  };

  if (!symbol) return <div>Invalid symbol</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{symbol}</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <TradingView 
              symbol={symbol}
              initialData={data}
            />
          </Card>
        </div>
        <div>
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Placer un Ordre</h2>
            <div className="space-y-4">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleOrderSubmit({
                  symbol,
                  type: 'MARKET',
                  side: 'BUY',
                  quantity: 1,
                  price: 0
                });
              }}>
                {/* Formulaire de trading à implémenter */}
                <Button type="submit">
                  Placer l'ordre
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}; 