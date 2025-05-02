import { UTCTimestamp } from 'lightweight-charts';

// Types de base pour les données de trading
export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol?: string;
}

export interface MarketInfo {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
}

export interface MarketData extends OHLCV {
  symbol: string;
}

// Types pour les ordres et positions
export interface OrderParams {
  symbol: string;
  type: 'MARKET' | 'LIMIT';
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
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

// Types pour les indicateurs et stratégies
export interface IndicatorParams extends Record<string, number> {
  period: number;
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  stdDev: number;
}

export interface Indicator {
  type: 'SMA' | 'RSI' | 'MACD' | 'BB';
  name: string;
  params: IndicatorParams;
}

export type StrategyType = 'trend' | 'momentum' | 'breakout' | 'mean-reversion';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: StrategyType;
  indicators: {
    name: string;
    type: string;
    params: Record<string, number>;
  }[];
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
  minDecisionInterval?: number;
}

export interface AlertData {
  price: number;
  type: 'above' | 'below';
}

export interface IndicatorValue {
  timestamp: UTCTimestamp;
  value: number;
}

// Types pour le backtest et la simulation
export interface BacktestPosition {
  type: 'long' | 'short';
  entry: number;
  exit: number;
  profit: number;
  timestamp: number;
  stopLoss?: number;
  takeProfit?: number;
  reason?: 'stop_loss' | 'take_profit' | 'signal' | 'trailing_stop' | 'target_reached';
}

export interface BacktestResult {
  initialBalance: number;
  finalBalance: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: {
    type: 'long' | 'short';
    entry: number;
    exit: number;
    profit: number;
    timestamp: number;
    reason?: 'stop_loss' | 'take_profit' | 'signal' | 'trailing_stop' | 'target_reached';
  }[];
  indicators: Record<string, number[]>;
  progress?: number;
}

// Types pour le portfolio
export interface Portfolio {
  totalValue: number;
  pnl24h: number;
  positions: {
    symbol: string;
    amount: number;
    value: number;
    pnl24h: number;
  }[];
}

export interface Balance {
  asset: string;
  free: number;
  used: number;
  total: number;
} 