import { UTCTimestamp } from 'lightweight-charts';
import type { OHLCV, IndicatorValue } from '@/types/trading';

class IndicatorsService {
  calculateSMA(data: OHLCV[], period: number): IndicatorValue[] {
    const result: IndicatorValue[] = [];
    const prices = data.map(d => d.close);

    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push({
        timestamp: (data[i].timestamp / 1000) as UTCTimestamp,
        value: sum / period
      });
    }

    return result;
  }

  calculateEMA(data: OHLCV[], period: number): IndicatorValue[] {
    const result: IndicatorValue[] = [];
    const prices = data.map(d => d.close);
    const multiplier = 2 / (period + 1);

    let ema = prices[0];
    result.push({
      timestamp: (data[0].timestamp / 1000) as UTCTimestamp,
      value: ema
    });

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
      result.push({
        timestamp: (data[i].timestamp / 1000) as UTCTimestamp,
        value: ema
      });
    }

    return result;
  }

  calculateRSI(data: OHLCV[], period: number = 14): IndicatorValue[] {
    const result: IndicatorValue[] = [];
    const prices = data.map(d => d.close);
    let gains = 0;
    let losses = 0;

    // Calculer les gains/pertes initiaux
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    gains /= period;
    losses /= period;

    // Calculer le RSI initial
    let rs = gains / losses;
    result.push({
      timestamp: (data[period].timestamp / 1000) as UTCTimestamp,
      value: 100 - (100 / (1 + rs))
    });

    // Calculer le reste des valeurs RSI
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains = ((gains * (period - 1)) + Math.max(0, change)) / period;
      losses = ((losses * (period - 1)) + Math.abs(Math.min(0, change))) / period;

      rs = gains / losses;
      result.push({
        timestamp: (data[i].timestamp / 1000) as UTCTimestamp,
        value: 100 - (100 / (1 + rs))
      });
    }

    return result;
  }

  calculateMACD(
    data: OHLCV[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): { macd: IndicatorValue[], signal: IndicatorValue[], histogram: IndicatorValue[] } {
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);

    // Calculer la ligne MACD
    const macdLine: IndicatorValue[] = [];
    for (let i = slowPeriod - 1; i < data.length; i++) {
      macdLine.push({
        timestamp: (data[i].timestamp / 1000) as UTCTimestamp,
        value: fastEMA[i].value - slowEMA[i].value
      });
    }

    // Calculer la ligne de signal (EMA du MACD)
    const signalLine = this.calculateEMA(
      macdLine.map((m, i) => ({
        ...data[i + slowPeriod - 1],
        close: m.value
      })),
      signalPeriod
    );

    // Calculer l'histogramme
    const histogram = macdLine.slice(signalPeriod - 1).map((macd, i) => ({
      timestamp: macd.timestamp,
      value: macd.value - signalLine[i].value
    }));

    return {
      macd: macdLine.slice(signalPeriod - 1),
      signal: signalLine,
      histogram
    };
  }

  calculateBollingerBands(
    data: OHLCV[],
    period: number = 20,
    stdDev: number = 2
  ): { upper: number[], middle: number[], lower: number[] } {
    const prices = data.map(d => d.close);
    const sma = this.calculateSMA(data, period).map(d => d.value);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = sma[i - (period - 1)];
      
      // Calculer l'écart type
      const squaredDiffs = slice.map(p => Math.pow(p - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b) / period;
      const standardDeviation = Math.sqrt(variance);

      upper.push(mean + (stdDev * standardDeviation));
      lower.push(mean - (stdDev * standardDeviation));
    }

    return { upper, middle: sma, lower };
  }

  calculateStochastic(
    data: OHLCV[],
    period: number = 14,
    smoothK: number = 3,
    smoothD: number = 3
  ): { k: number[], d: number[] } {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const closes = data.map(d => d.close);
    const k: number[] = [];
    
    // Calculer %K
    for (let i = period - 1; i < data.length; i++) {
      const highSlice = highs.slice(i - period + 1, i + 1);
      const lowSlice = lows.slice(i - period + 1, i + 1);
      const highest = Math.max(...highSlice);
      const lowest = Math.min(...lowSlice);
      
      if (highest === lowest) {
        k.push(50);
      } else {
        k.push(((closes[i] - lowest) / (highest - lowest)) * 100);
      }
    }

    // Lisser %K
    const smoothedK = this.calculateSMA(
      k.map((value, i) => ({
        timestamp: data[i + period - 1].timestamp,
        close: value,
        open: value,
        high: value,
        low: value,
        volume: 0
      })),
      smoothK
    ).map(d => d.value);

    // Calculer %D (moyenne mobile de %K)
    const smoothedD = this.calculateSMA(
      smoothedK.map((value, i) => ({
        timestamp: data[i + period - 1].timestamp,
        close: value,
        open: value,
        high: value,
        low: value,
        volume: 0
      })),
      smoothD
    ).map(d => d.value);

    return { k: smoothedK, d: smoothedD };
  }
}

export const indicatorsService = new IndicatorsService();

// Fonctions utilitaires exportées pour un accès direct
export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(0);
      continue;
    }
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

export function calculateRSI(prices: number[], period: number): number[] {
  const rsi: number[] = [];
  let gains: number[] = [];
  let losses: number[] = [];

  // Calculer les variations
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(Math.max(change, 0));
    losses.push(Math.max(-change, 0));
  }

  // Calculer le RSI
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      rsi.push(0);
      continue;
    }

    const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
}

export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[], middle: number[], lower: number[] } {
  const sma = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(0);
      lower.push(0);
      continue;
    }

    const slice = prices.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    upper.push(mean + stdDev * std);
    lower.push(mean - stdDev * std);
  }

  return { upper, middle: sma, lower };
} 