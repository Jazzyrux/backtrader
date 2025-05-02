import type { OHLCV } from '@/types/trading';
import type { Strategy, BacktestResult } from '@/types/strategy';

export class SimulationService {
  private baseUrl = '/api/simulation';

  async backtestStrategy(
    symbol: string,
    timeframe: string,
    strategy: Strategy,
    startTime?: number,
    endTime?: number
  ): Promise<BacktestResult> {
    try {
      const response = await fetch(`${this.baseUrl}/backtest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          timeframe,
          strategy,
          startTime,
          endTime
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Backtest failed');
      }

      const data = await response.json();
      return this.validateBacktestResult(data);
    } catch (error) {
      console.error('Backtest error:', error);
      throw error;
    }
  }

  private validateBacktestResult(data: any): BacktestResult {
    if (!data || !data.positions || !data.metrics || !data.returns) {
      throw new Error('Invalid backtest result format');
    }
    return data;
  }

  async simulateStrategy(
    symbol: string,
    timeframe: string,
    strategy: Strategy,
    historicalData: OHLCV[],
    futurePoints: number
  ): Promise<OHLCV[]> {
    const response = await fetch(`${this.baseUrl}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol,
        timeframe,
        strategy,
        historicalData,
        futurePoints
      })
    });

    if (!response.ok) {
      throw new Error('Simulation failed');
    }

    return response.json();
  }
}

export const simulationService = new SimulationService(); 