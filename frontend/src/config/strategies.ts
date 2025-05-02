import type { Strategy } from '@/types/trading';

export const predefinedStrategies: Strategy[] = [
  {
    id: 'sma-crossover',
    name: 'SMA Crossover',
    description: 'Simple Moving Average Crossover Strategy',
    indicators: [
      {
        type: 'SMA',
        name: 'SMA Fast',
        params: { period: 20 }
      },
      {
        type: 'SMA',
        name: 'SMA Slow',
        params: { period: 50 }
      }
    ]
  },
  {
    id: 'rsi-strategy',
    name: 'RSI Strategy',
    description: 'Relative Strength Index Strategy',
    indicators: [
      {
        type: 'RSI',
        name: 'RSI',
        params: { period: 14 }
      }
    ]
  },
  {
    id: 'macd-strategy',
    name: 'MACD Strategy',
    description: 'Moving Average Convergence Divergence Strategy',
    indicators: [
      {
        type: 'MACD',
        name: 'MACD',
        params: {
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9
        }
      }
    ]
  }
]; 