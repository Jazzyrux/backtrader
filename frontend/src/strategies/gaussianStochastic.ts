import type { OHLCV, Strategy, Position, StrategyType } from '@/types/trading';
import { calculateRSI, calculateBollingerBands } from '@/services/indicators';

type Signal = 'buy' | 'sell' | 'hold';

export const gaussianStochasticStrategy: Strategy = {
  id: 'gaussian-stochastic',
  name: 'Gaussian Stochastic Channel',
  description: 'Stratégie combinant moyenne gaussienne, canal stochastique et RSI',
  type: 'mean-reversion' as StrategyType,
  indicators: [
    { name: 'GMA', type: 'GAUSSIAN_MA', params: { period: 20, stdDev: 0 } },
    { name: 'RSI', type: 'RSI', params: { period: 14, stdDev: 0 } },
    { name: 'Stoch', type: 'STOCHASTIC', params: { period: 14, stdDev: 0 } }
  ],

  execute: (data: OHLCV[], currentPosition: Position | null) => {
    if (data.length < 34) return { signal: 'hold' as Signal };

    const indicators = gaussianStochasticStrategy.calculate(data);
    const lastIndex = data.length - 1;
    const prevIndex = lastIndex - 1;
    
    const price = data[lastIndex].close;
    const prevPrice = data[prevIndex].close;
    const upperBand = indicators.upper[lastIndex];
    const lowerBand = indicators.lower[lastIndex];
    const gma = indicators.gma[lastIndex];
    const stochK = indicators.stochK[lastIndex];
    const stochD = indicators.stochD[lastIndex];
    const rsi = indicators.rsi[lastIndex];
    const prevRsi = indicators.rsi[prevIndex];
    const prevStochK = indicators.stochK[prevIndex];

    if (!upperBand || !lowerBand || !gma || !stochK || !stochD || !rsi) {
      return { signal: 'hold' as Signal };
    }

    // Vérifier d'abord les conditions de sortie si nous avons une position
    if (currentPosition) {
      if (currentPosition.stopLoss && price <= currentPosition.stopLoss) {
        return {
          signal: 'sell' as Signal,
          price: price,
          timestamp: data[lastIndex].timestamp,
          reason: 'stop_loss'
        };
      }

      if (currentPosition.takeProfit && price >= currentPosition.takeProfit) {
        return {
          signal: 'sell' as Signal,
          price: price,
          timestamp: data[lastIndex].timestamp,
          reason: 'take_profit'
        };
      }

      const isOverbought = rsi > 70 && prevRsi <= 70;
      const isStochReversing = stochK < stochD && prevStochK >= stochD;
      const isPriceNearUpper = price > upperBand && prevPrice <= upperBand;

      if (isOverbought || isStochReversing || isPriceNearUpper) {
        return {
          signal: 'sell' as Signal,
          price: price,
          timestamp: data[lastIndex].timestamp,
          reason: 'signal'
        };
      }
    } else {
      // Conditions d'entrée pour une nouvelle position
      const isOversold = rsi < 30 && prevRsi >= 30;
      const isStochastic = stochK > stochD && prevStochK <= stochD;
      const isPriceNearLower = price < lowerBand && prevPrice >= lowerBand;

      if ((isOversold && isStochastic) || (isPriceNearLower && rsi < 40)) {
        const stopLoss = Math.min(price * 0.98, lowerBand * 0.99);
        const risk = price - stopLoss;
        const takeProfit = price + (risk * 2); // Ratio risque/récompense de 1:2

        return {
          signal: 'buy' as Signal,
          price: price,
          stopLoss: stopLoss,
          takeProfit: takeProfit,
          timestamp: data[lastIndex].timestamp
        };
      }
    }

    return { signal: 'hold' as Signal };
  },

  calculate: (data: OHLCV[], selectedMetrics?: string[]) => {
    if (data.length < 34) {
      return {
        gma: new Array(data.length).fill(null),
        upper: new Array(data.length).fill(null),
        lower: new Array(data.length).fill(null),
        rsi: new Array(data.length).fill(null),
        stochK: new Array(data.length).fill(null),
        stochD: new Array(data.length).fill(null)
      };
    }

    const closes = data.map(d => d.close);
    const N = 20; // Période pour GMA
    const K = 2.0; // Multiplicateur pour les bandes
    
    const result: Record<string, number[]> = {};

    // Calculer uniquement les indicateurs sélectionnés
    if (!selectedMetrics || selectedMetrics.includes('GMA')) {
      // Calculer GMA
      const gma: number[] = new Array(data.length).fill(null);
      for (let i = N - 1; i < closes.length; i++) {
        const sigma = N / 3.0;
        let sumWeights = 0;
        let sumWeighted = 0;
        for (let j = 0; j < N; j++) {
          const weight = Math.exp(-Math.pow(j, 2) / (2 * Math.pow(sigma, 2)));
          sumWeights += weight;
          sumWeighted += closes[i - j] * weight;
        }
        gma[i] = sumWeighted / sumWeights;
      }
      result.gma = gma;
    }

    if (!selectedMetrics || selectedMetrics.some(m => ['Upper', 'Middle', 'Lower'].includes(m))) {
      // Bandes de Bollinger
      const { upper, middle, lower } = calculateBollingerBands(closes, N, K);
      if (!selectedMetrics || selectedMetrics.includes('Upper')) result.upper = upper;
      if (!selectedMetrics || selectedMetrics.includes('Middle')) result.middle = middle;
      if (!selectedMetrics || selectedMetrics.includes('Lower')) result.lower = lower;
    }

    if (!selectedMetrics || selectedMetrics.includes('RSI')) {
      // RSI
      result.rsi = calculateRSI(closes, 14);
    }

    if (!selectedMetrics || selectedMetrics.some(m => ['StochK', 'StochD'].includes(m))) {
      // Stochastique
      const lengthStoch = 14;
      const smoothD = 3;
      const stochK: number[] = new Array(data.length).fill(null);
      const stochD: number[] = new Array(data.length).fill(null);
      
      for (let i = lengthStoch - 1; i < data.length; i++) {
        const slice = data.slice(i - lengthStoch + 1, i + 1);
        const highest = Math.max(...slice.map(d => d.high));
        const lowest = Math.min(...slice.map(d => d.low));
        
        if (highest === lowest) {
          stochK[i] = 50;
        } else {
          stochK[i] = ((closes[i] - lowest) / (highest - lowest)) * 100;
        }
        
        if (i >= lengthStoch + smoothD - 2) {
          const kSlice = stochK.slice(i - smoothD + 1, i + 1).filter(k => k !== null);
          if (kSlice.length === smoothD) {
            stochD[i] = kSlice.reduce((a, b) => a + b, 0) / smoothD;
          }
        }
      }
      
      if (!selectedMetrics || selectedMetrics.includes('StochK')) result.stochK = stochK;
      if (!selectedMetrics || selectedMetrics.includes('StochD')) result.stochD = stochD;
    }

    return result;
  }
};