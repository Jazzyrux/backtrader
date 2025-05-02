import type { Strategy } from '@/types/trading';
import { smaCrossoverStrategy } from '@/strategies/smaCrossover';
import { rsiStrategy } from '@/strategies/rsi';
import { bollingerBreakoutStrategy } from '@/strategies/bollingerBreakout';
import { meanReversionStrategy } from '@/strategies/meanReversion';
import { gaussianStochasticStrategy } from '@/strategies/gaussianStochastic';
import { gaussianStochasticOptimizedStrategy } from '@/strategies/gaussianStochasticOptimized';

const strategies: Strategy[] = [
  smaCrossoverStrategy,
  rsiStrategy,
  bollingerBreakoutStrategy,
  meanReversionStrategy,
  gaussianStochasticStrategy,
  gaussianStochasticOptimizedStrategy
];

export function getStrategy(id: string): Strategy | undefined {
  return strategies.find(strategy => strategy.id === id);
}

export function getStrategies(): Strategy[] {
  return strategies;
}

export * from '@/strategies/smaCrossover';
export * from '@/strategies/rsi';
export * from '@/strategies/bollingerBreakout';
export * from '@/strategies/meanReversion';
export * from '@/strategies/gaussianStochastic';
export * from '@/strategies/gaussianStochasticOptimized';
export * from './indicators'; 