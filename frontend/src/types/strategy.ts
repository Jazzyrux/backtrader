export interface Strategy {
  id: string;
  name: string;
  description: string;
  params: Record<string, number>;
  indicators: {
    name: string;
    type: string;
    params: Record<string, number>;
  }[];
}

export interface BacktestResult {
  returns: number[];
  positions: {
    entry: number;
    exit: number;
    profit: number;
    type: 'long' | 'short';
  }[];
  metrics: {
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;
    profitFactor: number;
  };
} 