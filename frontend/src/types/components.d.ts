import { FC } from 'react';
import { OHLCV, OrderParams, AlertData, Strategy } from './trading';
import type { IChartApi } from 'lightweight-charts';

export interface TradingChartProps {
  data: OHLCV[];
  pair: string;
}

export interface OrderFormProps {
  onSubmit: (order: OrderParams) => void;
  symbol: string;
}

export interface PriceAlertProps {
  currentPrice: number;
  symbol: string;
  onAlertSet: (price: number, type: 'above' | 'below') => void;
}

export interface TechnicalIndicatorsProps {
  chartInstance: IChartApi;
  data: OHLCV[];
}

export interface BacktestResults {
  data: OHLCV[];
  metrics: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
}

export interface BacktestPanelProps {
  onBacktestComplete?: (results: BacktestResults) => void;
}

export interface AIStrategyPanelProps {
  data: OHLCV[];
  symbol: string;
}

export interface LiveTradingProps {
  selectedPair: string;
} 