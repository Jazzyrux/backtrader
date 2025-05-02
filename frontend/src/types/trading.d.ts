import type { Time } from 'lightweight-charts';

export interface OHLCV {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderParams {
  symbol: string;
  type: 'market' | 'limit';
  side: 'buy' | 'sell';
  amount: number;
  price: number;
}

export interface AlertData {
  price: number;
  type: 'above' | 'below';
}

export interface IndicatorValue {
  time: number;
  value: number;
}

export interface Strategy {
  id: string;
  name: string;
  type: string;
  params: Record<string, any>;
} 