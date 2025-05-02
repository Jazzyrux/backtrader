import type { OHLCV, Position, StrategyType, Strategy } from '@/types/trading';
import { calculateSMA } from '@/services/indicators';

export const smaCrossoverStrategy: Strategy = {
  id: 'sma-crossover',
  name: 'SMA Crossover',
  description: 'Croisement de moyennes mobiles simples',
  type: 'trend' as StrategyType,
  minDecisionInterval: 30000, // 30 secondes minimum entre les décisions
  indicators: [
    { name: 'SMA Fast', type: 'SMA', params: { period: 9, stdDev: 0 } },
    { name: 'SMA Slow', type: 'SMA', params: { period: 21, stdDev: 0 } }
  ],

  execute: (data: OHLCV[], currentPosition: Position | null) => {
    const indicators = smaCrossoverStrategy.calculate(data);
    const lastIndex = data.length - 1;
    const prevIndex = lastIndex - 1;
    
    if (!indicators.fastSMA[lastIndex] || !indicators.slowSMA[lastIndex]) {
      return { signal: 'hold', probability: 0.5 };
    }

    const price = data[lastIndex].close;
    const volume = data[lastIndex].volume;
    const prevVolume = data[prevIndex].volume;
    const fastSMA = indicators.fastSMA[lastIndex];
    const slowSMA = indicators.slowSMA[lastIndex];
    const prevFastSMA = indicators.fastSMA[prevIndex];
    const prevSlowSMA = indicators.slowSMA[prevIndex];

    // Calcul de la probabilité de succès
    const calculateProbability = (isLong: boolean): number => {
      let probability = 0.5; // Base neutre

      // Force du croisement
      const crossoverStrength = Math.abs(fastSMA - slowSMA) / slowSMA;
      probability += crossoverStrength * 0.2;

      // Tendance des volumes
      if (volume > prevVolume) probability += 0.1;

      // Distance entre les moyennes mobiles
      const smaDistance = Math.abs(fastSMA - slowSMA) / slowSMA;
      if (smaDistance > 0.002) probability += 0.1;

      // Momentum
      const fastSMASlope = (fastSMA - prevFastSMA) / prevFastSMA;
      if ((isLong && fastSMASlope > 0) || (!isLong && fastSMASlope < 0)) {
        probability += 0.1;
      }

      // Confirmation de la tendance
      const priceVsSMA = (price - slowSMA) / slowSMA;
      if ((isLong && priceVsSMA > 0) || (!isLong && priceVsSMA < 0)) {
        probability += 0.1;
      }

      return Math.min(0.95, Math.max(0.05, probability));
    };

    if (currentPosition) {
      // Vérifier les conditions de sortie
      if (currentPosition.stopLoss && price <= currentPosition.stopLoss) {
        return {
          signal: 'sell',
          price: price,
          timestamp: data[lastIndex].timestamp,
          reason: 'stop_loss' as const,
          probability: calculateProbability(false)
        };
      }

      if (currentPosition.takeProfit && price >= currentPosition.takeProfit) {
        return {
          signal: 'sell',
          price: price,
          timestamp: data[lastIndex].timestamp,
          reason: 'take_profit' as const,
          probability: calculateProbability(false)
        };
      }

      if (fastSMA < slowSMA && prevFastSMA >= prevSlowSMA) {
        return {
          signal: 'sell',
          price: price,
          timestamp: data[lastIndex].timestamp,
          reason: 'signal' as const,
          probability: calculateProbability(false)
        };
      }
    } else {
      if (fastSMA > slowSMA && prevFastSMA <= prevSlowSMA) {
        const stopLoss = price * 0.95;
        const risk = price - stopLoss;
        const takeProfit = price + (risk * 2);

        return {
          signal: 'buy',
          price: price,
          stopLoss: stopLoss,
          takeProfit: takeProfit,
          timestamp: data[lastIndex].timestamp,
          probability: calculateProbability(true)
        };
      }
    }
    
    return { 
      signal: 'hold',
      probability: 0.5
    };
  },
  
  calculate: (data: OHLCV[]) => {
    const prices = data.map(d => d.close);
    const fastSMA = calculateSMA(prices, 9);
    const slowSMA = calculateSMA(prices, 21);
    return { fastSMA, slowSMA };
  }
}; 