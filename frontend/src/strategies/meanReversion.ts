import type { OHLCV, Position, StrategyType, Strategy } from '@/types/trading';
import { calculateBollingerBands, calculateRSI } from '@/services/indicators';

export const meanReversionStrategy: Strategy = {
  id: 'mean-reversion',
  name: 'Mean Reversion',
  description: 'Trading de retour à la moyenne avec RSI et Bollinger',
  type: 'mean-reversion' as StrategyType,
  minDecisionInterval: 30000, // 30 secondes minimum entre les décisions
  indicators: [
    { name: 'BB Upper', type: 'BB', params: { period: 20, stdDev: 2 } },
    { name: 'BB Middle', type: 'BB', params: { period: 20, stdDev: 0 } },
    { name: 'BB Lower', type: 'BB', params: { period: 20, stdDev: 2 } },
    { name: 'RSI', type: 'RSI', params: { period: 14, stdDev: 0 } }
  ],

  execute: (data: OHLCV[], currentPosition: Position | null) => {
    const indicators = meanReversionStrategy.calculate(data);
    const lastIndex = data.length - 1;
    const prevIndex = lastIndex - 1;
    
    if (!indicators.upper[lastIndex] || !indicators.rsi[lastIndex]) {
      return { signal: 'hold', probability: 0.5 };
    }

    const price = data[lastIndex].close;
    const prevPrice = data[prevIndex].close;
    const upper = indicators.upper[lastIndex];
    const middle = indicators.middle[lastIndex];
    const lower = indicators.lower[lastIndex];
    const rsi = indicators.rsi[lastIndex];
    const prevRsi = indicators.rsi[prevIndex];
    const volume = data[lastIndex].volume;
    const prevVolume = data[prevIndex].volume;

    // Calcul de la probabilité de succès
    const calculateProbability = (isLong: boolean): number => {
      let probability = 0.5; // Base neutre

      // Distance par rapport aux bandes
      const bandWidth = (upper - lower) / middle;
      if (isLong) {
        const distanceToLower = (price - lower) / bandWidth;
        probability += Math.min(0.2, 1 - distanceToLower);
      } else {
        const distanceToUpper = (upper - price) / bandWidth;
        probability += Math.min(0.2, 1 - distanceToUpper);
      }

      // Force du RSI
      if (isLong) {
        probability += (30 - Math.min(30, rsi)) / 30 * 0.2;
      } else {
        probability += (Math.max(70, rsi) - 70) / 30 * 0.2;
      }

      // Tendance des volumes
      const volumeRatio = volume / prevVolume;
      if (volumeRatio > 1.2) probability += 0.1;

      // Vitesse de retour à la moyenne
      const priceToMiddle = Math.abs(price - middle) / middle;
      const prevPriceToMiddle = Math.abs(prevPrice - middle) / middle;
      if (priceToMiddle < prevPriceToMiddle) probability += 0.1;

      // Momentum du RSI
      const rsiChange = rsi - prevRsi;
      if ((isLong && rsiChange > 0) || (!isLong && rsiChange < 0)) {
        probability += 0.1;
      }

      // Volatilité
      const volatility = (upper - lower) / middle;
      if (volatility > 0.02) probability += 0.1;

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

      if (price > upper || rsi > 70) {
        return {
          signal: 'sell',
          price: price,
          timestamp: data[lastIndex].timestamp,
          reason: 'signal' as const,
          probability: calculateProbability(false)
        };
      }
    } else {
      if (price < lower && rsi < 30) {
        const stopLoss = price * 0.95;
        const takeProfit = middle;
        
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
    const { upper, middle, lower } = calculateBollingerBands(prices, 20, 2);
    const rsi = calculateRSI(prices, 14);
    return { upper, middle, lower, rsi };
  }
}; 