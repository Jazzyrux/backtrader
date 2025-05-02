import type { OHLCV, Position, StrategyType, Strategy } from '@/types/trading';
import { calculateBollingerBands } from '@/services/indicators';

export const bollingerBreakoutStrategy: Strategy = {
  id: 'bollinger-breakout',
  name: 'Bollinger Breakout',
  description: 'Trading de breakout avec les bandes de Bollinger',
  type: 'breakout' as StrategyType,
  minDecisionInterval: 30000, // 30 secondes minimum entre les décisions
  indicators: [
    { name: 'BB Upper', type: 'BB', params: { period: 20, stdDev: 2 } },
    { name: 'BB Middle', type: 'BB', params: { period: 20, stdDev: 0 } },
    { name: 'BB Lower', type: 'BB', params: { period: 20, stdDev: 2 } }
  ],

  execute: (data: OHLCV[], currentPosition: Position | null) => {
    const indicators = bollingerBreakoutStrategy.calculate(data);
    const lastIndex = data.length - 1;
    const prevIndex = lastIndex - 1;
    
    if (!indicators.upper[lastIndex] || !indicators.middle[lastIndex] || !indicators.lower[lastIndex]) {
      return { signal: 'hold', probability: 0.5 };
    }

    const price = data[lastIndex].close;
    const prevPrice = data[prevIndex].close;
    const upper = indicators.upper[lastIndex];
    const middle = indicators.middle[lastIndex];
    const lower = indicators.lower[lastIndex];
    const prevUpper = indicators.upper[prevIndex];
    const prevLower = indicators.lower[prevIndex];
    const volume = data[lastIndex].volume;
    const prevVolume = data[prevIndex].volume;

    // Calcul de la probabilité de succès
    const calculateProbability = (isLong: boolean): number => {
      let probability = 0.5; // Base neutre

      // Force du breakout
      const bandWidth = (upper - lower) / middle;
      const breakoutStrength = Math.abs(price - (isLong ? upper : lower)) / bandWidth;
      probability += Math.min(0.2, breakoutStrength);

      // Tendance des volumes
      const volumeRatio = volume / prevVolume;
      if (volumeRatio > 1.2) probability += 0.15;
      else if (volumeRatio > 1.1) probability += 0.1;

      // Distance par rapport à la moyenne mobile
      const priceToMiddle = Math.abs(price - middle) / middle;
      if (priceToMiddle < 0.002) probability += 0.1;

      // Momentum
      const priceChange = (price - prevPrice) / prevPrice;
      if ((isLong && priceChange > 0) || (!isLong && priceChange < 0)) {
        probability += 0.1;
      }

      // Volatilité
      const volatility = (upper - lower) / middle;
      if (volatility > 0.02) probability += 0.1;

      // Confirmation du breakout
      if (isLong) {
        if (price > prevUpper) probability += 0.1;
      } else {
        if (price < prevLower) probability += 0.1;
      }

      return Math.min(0.95, Math.max(0.05, probability));
    };
    
    if (currentPosition) {
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
      
      if (price < middle) {
        return {
          signal: 'sell',
          price: price,
          timestamp: data[lastIndex].timestamp,
          reason: 'signal' as const,
          probability: calculateProbability(false)
        };
      }
    } else {
      if (price > upper && volume > prevVolume) {
        const stopLoss = middle;
        const risk = price - stopLoss;
        const takeProfit = price + risk;
        
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
    return calculateBollingerBands(prices, 20, 2);
  }
}; 