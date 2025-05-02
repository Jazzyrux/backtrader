import type { OHLCV, Strategy, Position, StrategyType } from '@/types/trading';
import { calculateRSI, calculateBollingerBands } from '@/services/indicators';

type ProgressCallback = (step: string, progress: number) => void;

// Fonctions utilitaires pour EMA et ATR
function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = new Array(data.length).fill(null);
  ema[period - 1] = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i] * k) + (ema[i - 1] * (1 - k));
  }
  return ema;
}

function calculateATR(data: OHLCV[], period: number): number[] {
  const atr: number[] = new Array(data.length).fill(null);
  for (let i = 1; i < data.length; i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
    if (i >= period) {
      atr[i] = (atr[i - 1] * (period - 1) + tr) / period;
    } else if (i === period - 1) {
      atr[i] = tr;
    }
  }
  return atr;
}

function calculateIndicators(data: OHLCV[], onProgress?: ProgressCallback | null) {
  const safeProgress = (step: string, progress: number) => {
    if (typeof onProgress === 'function') {
      try {
        onProgress(step, progress);
      } catch (error) {
        console.warn('Erreur lors de la mise à jour de la progression:', error);
      }
    }
  };

  const result: Record<string, number[]> = {
    gma: new Array(data.length).fill(null),
    upper: new Array(data.length).fill(null),
    lower: new Array(data.length).fill(null),
    middle: new Array(data.length).fill(null),
    rsi: new Array(data.length).fill(null),
    stochK: new Array(data.length).fill(null),
    stochD: new Array(data.length).fill(null),
    ema50: new Array(data.length).fill(null),
    atr: new Array(data.length).fill(null)
  };

  if (data.length < 50) {
    safeProgress('Initialisation', 0);
    return result;
  }

  try {
    safeProgress('Préparation des données', 10);
    const closes = data.map(d => d.close);
    const N = 20;
    const atrPeriod = 14;

    // Calculer GMA
    safeProgress('Calcul GMA', 20);
    for (let i = N - 1; i < closes.length; i++) {
      const sigma = N / 3.0;
      let sumWeights = 0;
      let sumWeighted = 0;
      for (let j = 0; j < N; j++) {
        const weight = Math.exp(-Math.pow(j, 2) / (2 * Math.pow(sigma, 2)));
        sumWeights += weight;
        sumWeighted += closes[i - j] * weight;
      }
      result.gma[i] = sumWeighted / sumWeights;
    }

    // Bandes de Bollinger
    safeProgress('Calcul Bandes de Bollinger', 40);
    const bb = calculateBollingerBands(closes, N, 2.0);
    result.upper = bb.upper;
    result.lower = bb.lower;
    result.middle = bb.middle;

    // RSI
    safeProgress('Calcul RSI', 60);
    const rsi = calculateRSI(closes, 14);
    result.rsi = rsi;

    // Stochastique
    safeProgress('Calcul Stochastique', 70);
    const lengthStoch = 14;
    const smoothD = 3;
    
    for (let i = lengthStoch - 1; i < data.length; i++) {
      const slice = data.slice(i - lengthStoch + 1, i + 1);
      const highest = Math.max(...slice.map(d => d.high));
      const lowest = Math.min(...slice.map(d => d.low));
      result.stochK[i] = highest === lowest ? 50 : ((closes[i] - lowest) / (highest - lowest)) * 100;
      
      if (i >= lengthStoch + smoothD - 2) {
        const kSlice = result.stochK.slice(i - smoothD + 1, i + 1).filter(k => k !== null);
        if (kSlice.length === smoothD) {
          result.stochD[i] = kSlice.reduce((a, b) => a + b, 0) / smoothD;
        }
      }
    }

    // EMA 50
    safeProgress('Calcul EMA', 85);
    result.ema50 = calculateEMA(closes, 50);

    // ATR
    safeProgress('Calcul ATR', 95);
    result.atr = calculateATR(data, atrPeriod);

  } catch (error) {
    console.error('Erreur lors du calcul des indicateurs:', error);
    throw error;
  }

  safeProgress('Calculs terminés', 100);
  return result;
}

export const gaussianStochasticOptimizedStrategy: Strategy = {
  id: 'gaussian-stochastic-optimized',
  name: 'Gaussian Stochastic Channel Optimized',
  description: 'Stratégie optimisée combinant EMA 50, bandes de Bollinger, RSI, Stochastique, et ATR',
  type: 'mean-reversion' as StrategyType,
  minDecisionInterval: 30000,
  indicators: [
    { name: 'GMA', type: 'GAUSSIAN_MA', params: { period: 20, stdDev: 0 } },
    { name: 'RSI', type: 'RSI', params: { period: 14, stdDev: 0 } },
    { name: 'Stoch', type: 'STOCHASTIC', params: { period: 14, stdDev: 0 } },
    { name: 'EMA', type: 'EMA', params: { period: 50, stdDev: 0 } },
    { name: 'ATR', type: 'ATR', params: { period: 14, stdDev: 0 } }
  ],
  calculate: (data: OHLCV[], selectedMetrics?: string[]) => {
    const onProgress = (step: string, progress: number) => {
      console.debug(`[${step}] ${progress}%`);
    };
    const result = calculateIndicators(data, onProgress);
    
    // Si selectedMetrics est défini, ne retourner que les indicateurs sélectionnés
    if (selectedMetrics && selectedMetrics.length > 0) {
      return Object.fromEntries(
        Object.entries(result).filter(([key]) => selectedMetrics.includes(key))
      );
    }
    
    return result;
  },
  execute: (data: OHLCV[], currentPosition: Position | null) => {
    if (data.length < 50) {
      return { signal: 'hold' as const, probability: 0.5 };
    }

    const indicators = calculateIndicators(data);
    const lastIndex = data.length - 1;
    const prevIndex = lastIndex - 1;
    
    const price = data[lastIndex].close;
    const prevPrice = data[prevIndex].close;
    const upper = indicators.upper[lastIndex];
    const middle = indicators.middle[lastIndex];
    const lower = indicators.lower[lastIndex];
    const stochK = indicators.stochK[lastIndex];
    const stochD = indicators.stochD[lastIndex];
    const rsi = indicators.rsi[lastIndex];
    const prevStochK = indicators.stochK[prevIndex];
    const ema50 = indicators.ema50[lastIndex];
    const atr = indicators.atr[lastIndex];
    const volume = data[lastIndex].volume;
    const prevVolume = data[prevIndex].volume;

    if (!upper || !lower || !middle || !stochK || !stochD || !rsi || !ema50 || !atr) {
      return { signal: 'hold' as const, probability: 0.5 };
    }

    // Calcul de la probabilité de succès
    const calculateProbability = (isLong: boolean): number => {
      let probability = 0.5; // Base neutre

      // Force du signal stochastique
      if (isLong) {
        probability += (20 - Math.min(20, stochK)) / 20 * 0.15;
        if (stochK > stochD && prevStochK <= stochD) probability += 0.1;
      } else {
        probability += (Math.max(80, stochK) - 80) / 20 * 0.15;
        if (stochK < stochD && prevStochK >= stochD) probability += 0.1;
      }

      // Force du RSI
      if (isLong) {
        probability += (30 - Math.min(30, rsi)) / 30 * 0.15;
      } else {
        probability += (Math.max(70, rsi) - 70) / 30 * 0.15;
      }

      // Distance par rapport aux bandes
      const bandWidth = (upper - lower) / middle;
      if (isLong) {
        const distanceToLower = (price - lower) / bandWidth;
        probability += Math.min(0.15, 1 - distanceToLower);
      } else {
        const distanceToUpper = (upper - price) / bandWidth;
        probability += Math.min(0.15, 1 - distanceToUpper);
      }

      // Tendance des volumes
      const volumeRatio = volume / prevVolume;
      if (volumeRatio > 1.2) probability += 0.1;

      // Momentum
      const priceChange = (price - prevPrice) / prevPrice;
      if ((isLong && priceChange > 0) || (!isLong && priceChange < 0)) {
        probability += 0.1;
      }

      // Volatilité
      const volatility = atr / price;
      if (volatility > 0.002) probability += 0.1;

      return Math.min(0.95, Math.max(0.05, probability));
    };

    if (currentPosition) {
      // Trailing stop basé sur ATR
      const trailingStop = currentPosition.entryPrice - (2 * atr);
      if (price <= trailingStop) {
        return {
          signal: 'sell' as const,
          price: price,
          timestamp: data[lastIndex].timestamp,
          reason: 'trailing_stop' as const,
          probability: calculateProbability(false)
        };
      }

      // Sortie sur signal stochastique et RSI
      const isOverbought = rsi > 70 && stochK > 80;
      const isStochReversing = stochK < stochD && prevStochK >= stochD;
      if (isOverbought || isStochReversing) {
        return {
          signal: 'sell' as const,
          price: price,
          timestamp: data[lastIndex].timestamp,
          reason: 'signal' as const,
          probability: calculateProbability(false)
        };
      }

      // Take profit dynamique basé sur les bandes de Bollinger
      if (price >= upper) {
        return {
          signal: 'sell' as const,
          price: price,
          timestamp: data[lastIndex].timestamp,
          reason: 'target_reached' as const,
          probability: calculateProbability(false)
        };
      }
    } else {
      // Conditions d'entrée optimisées
      const isOversold = rsi < 30 && stochK < 20;
      const isStochCrossing = stochK > stochD && prevStochK <= stochD;
      const isNearLower = price < lower;
      const hasVolume = volume > prevVolume * 1.2;

      if ((isOversold || (isNearLower && isStochCrossing)) && hasVolume) {
        const stopLoss = price - (2 * atr);
        const takeProfit = price + (4 * atr);

        return {
          signal: 'buy' as const,
          price: price,
          stopLoss: stopLoss,
          takeProfit: takeProfit,
          timestamp: data[lastIndex].timestamp,
          probability: calculateProbability(true)
        };
      }
    }

    return { 
      signal: 'hold' as const,
      probability: 0.5
    };
  }
}; 