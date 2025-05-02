import { Link } from 'react-router-dom';
import { useState } from 'react';

interface MarketPair {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

interface MarketCategories {
  [key: string]: MarketPair[];
}

const marketCategories: MarketCategories = {
  'Popular': [
    { symbol: 'BTC/USDT', name: 'Bitcoin', price: 0, change24h: 0 },
    { symbol: 'ETH/USDT', name: 'Ethereum', price: 0, change24h: 0 },
  ],
  'DeFi': [
    { symbol: 'UNI/USDT', name: 'Uniswap', price: 0, change24h: 0 },
    { symbol: 'AAVE/USDT', name: 'Aave', price: 0, change24h: 0 },
  ],
};

export const Markets = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = Object.entries(marketCategories).reduce((acc, [category, pairs]) => {
    const filteredPairs = pairs.filter(pair => 
      pair.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pair.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filteredPairs.length > 0) {
      acc[category] = filteredPairs;
    }
    return acc;
  }, {} as typeof marketCategories);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="heading-1">Markets</h1>
        <input
          type="text"
          placeholder="Search markets..."
          className="input w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {Object.entries(filteredCategories).map(([category, pairs]) => (
        <section key={category} className="mb-8">
          <h2 className="heading-2">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pairs.map(({ symbol, name, price, change24h }) => (
              <Link
                key={symbol}
                to={`/coins/${encodeURIComponent(symbol)}`}
                className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{name}</h3>
                    <p className="text-gray-400">{symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${price.toFixed(2)}</p>
                    <p className={change24h >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}; 