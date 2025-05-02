import { OHLCV, Strategy } from '../types/trading';

export const BASE_URL = 'http://localhost:8000/api';

export const tradingApi = {
  BASE_URL,
  async getMarketData(symbol: string): Promise<OHLCV[]> {
    const response = await fetch(`${BASE_URL}/market/ohlcv/${symbol}`);
    return response.json();
  },

  async runBacktest(strategy: Strategy): Promise<any> {
    const response = await fetch(`${BASE_URL}/strategies/backtest/live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(strategy),
    });
    return response.json();
  },
}; 