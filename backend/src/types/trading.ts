export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  quantity: number;
  unrealizedPnL: number;
  timestamp: number;
  stopLoss?: number;
  takeProfit?: number;
  exitPrice?: number;
  exitTimestamp?: number;
  exitReason?: 'stop_loss' | 'take_profit' | 'signal' | 'trailing_stop' | 'target_reached';
}

export interface IndicatorParams {
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  stdDev?: number;
}

export interface Indicator {
  name: string;
  type: string;
  params: IndicatorParams;
}

export type StrategyType = 'trend' | 'momentum' | 'breakout' | 'mean-reversion';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: StrategyType;
  indicators: Indicator[];
  minDecisionInterval?: number;
  execute: (data: OHLCV[], currentPosition: Position | null) => {
    signal: 'buy' | 'sell' | 'hold';
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
    timestamp?: number;
    reason?: 'stop_loss' | 'take_profit' | 'signal' | 'trailing_stop' | 'target_reached';
    probability?: number;
  };
  calculate: (data: OHLCV[], selectedMetrics?: string[]) => Record<string, number[]>;
} 