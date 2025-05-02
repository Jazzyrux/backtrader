import type { OHLCV, Position, StrategyType, Strategy } from '@/types/trading';
import { calculateRSI } from '@/services/indicators';

export const rsiStrategy: Strategy = {
  id: 'rsi',
  name: 'RSI Strategy',
  description: 'Trading basé sur le RSI',
  type: 'momentum' as StrategyType,
  minDecisionInterval: 30000, // 30 secondes minimum entre les décisions
  indicators: [
    { name: 'RSI', type: 'RSI', params: { period: 14, stdDev: 0 } }
  ],

  execute: (data: OHLCV[], currentPosition: Position | null) => {
    const indicators = rsiStrategy.calculate(data);
    const lastIndex = data.length - 1;
    const prevIndex = lastIndex - 1;
    
    if (!indicators.rsi[lastIndex]) {
      return { signal: 'hold', probability: 0.5 };
    }

    const price = data[lastIndex].close;
    const prevPrice = data[prevIndex].close;
    const rsi = indicators.rsi[lastIndex];
    const prevRsi = indicators.rsi[prevIndex];
    const volume = data[lastIndex].volume;
    const prevVolume = data[prevIndex].volume;

    // Calcul de la probabilité de succès
    const calculateProbability = (isLong: boolean): number => {
      let probability = 0.5; // Base neutre

      // Force du RSI
      if (isLong) {
        // Plus le RSI est bas, plus la probabilité est haute pour un long
        probability += (30 - Math.min(30, rsi)) / 30 * 0.2;
      } else {
        // Plus le RSI est haut, plus la probabilité est haute pour un short
        probability += (Math.max(70, rsi) - 70) / 30 * 0.2;
      }

      // Tendance des volumes
      if (volume > prevVolume * 1.1) probability += 0.1;

      // Momentum du RSI
      const rsiChange = rsi - prevRsi;
      if ((isLong && rsiChange > 0) || (!isLong && rsiChange < 0)) {
        probability += 0.1;
      }

      // Divergence prix/RSI
      const priceChange = (price - prevPrice) / prevPrice;
      const rsiChangeNorm = (rsi - prevRsi) / prevRsi;
      if (Math.sign(priceChange) !== Math.sign(rsiChangeNorm)) {
        probability += 0.1;
      }

      // Force du mouvement
      const priceVolatility = Math.abs(price - prevPrice) / prevPrice;
      if (priceVolatility > 0.002) probability += 0.1;

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
      
      if (rsi > 70) {
        return {
          signal: 'sell',
          price: price,
          timestamp: data[lastIndex].timestamp,
          reason: 'signal' as const,
          probability: calculateProbability(false)
        };
      }
    } else {
      if (rsi < 30) {
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
    const rsi = calculateRSI(prices, 14);
    return { rsi };
  }
}; 