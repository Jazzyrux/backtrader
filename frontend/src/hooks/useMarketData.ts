import { useState, useEffect } from 'react';
import { binanceService, type MarketData } from '@/services/binance';

export const useMarketData = (symbol: string) => {
  const [marketData, setMarketData] = useState<MarketData | undefined>();

  useEffect(() => {
    if (!symbol) return;

    // Charger les données initiales
    const loadInitialData = async () => {
      const data = await binanceService.getMarketData(symbol);
      if (data) {
        setMarketData(data);
      }
    };

    loadInitialData();

    // S'abonner aux mises à jour en temps réel
    const unsubscribe = binanceService.subscribe((marketDataMap) => {
      const updatedData = marketDataMap.get(symbol.replace('/', ''));
      if (updatedData) {
        setMarketData(updatedData);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [symbol]);

  return marketData;
}; 