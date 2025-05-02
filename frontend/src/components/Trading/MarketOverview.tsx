import React, { useEffect, useState } from 'react';
import { binanceService } from '@/services/binance';
import type { MarketInfo } from '@/types/trading';
import { Card } from '@/components/ui/Card';
import { formatNumber, formatPercent, formatPrice } from '@/utils/format';

interface MarketOverviewProps {
  symbol: string;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ symbol }) => {
  const [marketData, setMarketData] = useState<MarketInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMarketData = async () => {
      try {
        const data = await binanceService.getMarketInfo(symbol);
        setMarketData(data);
      } catch (error) {
        console.error('Erreur lors du chargement des données de marché:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMarketData();

    // S'abonner aux mises à jour en temps réel
    const unsubscribe = binanceService.subscribeToTicker(symbol, (data) => {
      setMarketData(data);
    });

    return () => {
      unsubscribe();
    };
  }, [symbol]);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
        </div>
      </Card>
    );
  }

  if (!marketData) {
    return (
      <Card className="p-4">
        <div className="text-gray-400">
          Données non disponibles
        </div>
      </Card>
    );
  }

  const stats = [
    {
      label: 'Prix',
      value: formatPrice(marketData.price),
      change: marketData.priceChangePercent,
    },
    {
      label: 'Volume 24h',
      value: formatNumber(marketData.volume),
    },
    {
      label: 'Plus Haut 24h',
      value: formatPrice(marketData.high24h),
    },
    {
      label: 'Plus Bas 24h',
      value: formatPrice(marketData.low24h),
    },
  ];

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Aperçu du Marché</h3>
      <div className="grid gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex justify-between items-center">
            <span className="text-gray-400">{stat.label}</span>
            <div className="text-right">
              <span className="font-medium">{stat.value}</span>
              {stat.change !== undefined && (
                <span className={`ml-2 text-sm ${stat.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatPercent(stat.change)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}; 