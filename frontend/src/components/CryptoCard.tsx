import { useMarketData } from '@/hooks/useMarketData';
import { MiniChart } from './MiniChart';

interface CryptoCardProps {
  symbol: string;
}

export const CryptoCard: React.FC<CryptoCardProps> = ({ symbol }) => {
  const marketData = useMarketData(symbol);

  if (!marketData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{symbol}</h3>
          <div className="mt-2">
            <p className="text-2xl">${marketData.price.toFixed(2)}</p>
            <p className={`text-sm ${marketData.priceChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {marketData.priceChangePercent.toFixed(2)}%
            </p>
          </div>
        </div>
        <MiniChart 
          symbol={symbol} 
          positive={marketData.priceChangePercent >= 0} 
        />
      </div>
      <div className="mt-4 text-sm">
        <p>Volume: ${marketData.volume.toLocaleString()}</p>
        <p>24h High: ${marketData.high24h.toFixed(2)}</p>
        <p>24h Low: ${marketData.low24h.toFixed(2)}</p>
      </div>
    </div>
  );
}; 