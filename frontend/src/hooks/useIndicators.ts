import { useMemo } from 'react';
import type { OHLCV, Indicator, IndicatorValue } from '@/types/trading';
import { UTCTimestamp } from 'lightweight-charts';

export const useIndicators = (data: OHLCV[], indicators: Indicator[]) => {
  return useMemo(() => {
    const calculateSMA = (prices: number[], period: number): IndicatorValue[] => {
      const sma: IndicatorValue[] = [];
      for (let i = period - 1; i < prices.length; i++) {
        const slice = prices.slice(i - period + 1, i + 1);
        const sum = slice.reduce((acc, val) => acc + val, 0);
        sma.push({
          timestamp: (data[i].timestamp / 1000) as UTCTimestamp,
          value: sum / period
        });
      }
      return sma;
    };

    const calculateRSI = (prices: number[], period: number): IndicatorValue[] => {
      const rsi: IndicatorValue[] = [];
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
      rsi.push({
        timestamp: (data[period].timestamp / 1000) as UTCTimestamp,
        value: 100 - (100 / (1 + rs))
      });

      // Calculer le reste des valeurs RSI
      for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        gains = ((gains * (period - 1)) + Math.max(0, change)) / period;
        losses = ((losses * (period - 1)) + Math.abs(Math.min(0, change))) / period;

        rs = gains / losses;
        rsi.push({
          timestamp: (data[i].timestamp / 1000) as UTCTimestamp,
          value: 100 - (100 / (1 + rs))
        });
      }

      return rsi;
    };

    const calculateMACD = (prices: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number): IndicatorValue[] => {
      const fastEMA = calculateEMA(prices, fastPeriod);
      const slowEMA = calculateEMA(prices, slowPeriod);
      const macdLine = fastEMA.map((fast, i) => ({
        timestamp: (data[i + slowPeriod - 1].timestamp / 1000) as UTCTimestamp,
        value: fast - slowEMA[i]
      }));
      
      const signalLine = calculateEMA(
        macdLine.map(m => m.value),
        signalPeriod
      );

      return macdLine.slice(signalPeriod - 1).map((macd, i) => ({
        timestamp: macd.timestamp,
        value: macd.value - signalLine[i]
      }));
    };

    const calculateEMA = (prices: number[], period: number): number[] => {
      const multiplier = 2 / (period + 1);
      const ema: number[] = [prices[0]];
      
      for (let i = 1; i < prices.length; i++) {
        ema.push(
          (prices[i] - ema[i - 1]) * multiplier + ema[i - 1]
        );
      }
      
      return ema;
    };

    const prices = data.map(d => d.close);
    const results = new Map<string, IndicatorValue[]>();

    indicators.forEach(indicator => {
      switch (indicator.type) {
        case 'SMA':
          results.set(
            indicator.name,
            calculateSMA(prices, indicator.params.period || 20)
          );
          break;
        case 'RSI':
          results.set(
            indicator.name,
            calculateRSI(prices, indicator.params.period || 14)
          );
          break;
        case 'MACD':
          results.set(
            indicator.name,
            calculateMACD(
              prices,
              indicator.params.fastPeriod || 12,
              indicator.params.slowPeriod || 26,
              indicator.params.signalPeriod || 9
            )
          );
          break;
      }
    });

    return results;
  }, [data, indicators]);
}; 