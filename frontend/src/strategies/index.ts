import type { Strategy } from '@/types/trading';
import { smaCrossoverStrategy } from './smaCrossover';
import { rsiStrategy } from './rsi';
import { bollingerBreakoutStrategy } from './bollingerBreakout';
import { meanReversionStrategy } from './meanReversion';
import { gaussianStochasticStrategy } from './gaussianStochastic';
import { gaussianStochasticOptimizedStrategy } from './gaussianStochasticOptimized';
import { lorentzianClassificationStrategy } from './lorentzianClassification';

const strategies: Strategy[] = [
  smaCrossoverStrategy,
  rsiStrategy,
  bollingerBreakoutStrategy,
  meanReversionStrategy,
  gaussianStochasticStrategy,
  gaussianStochasticOptimizedStrategy,
  lorentzianClassificationStrategy
];

export function getStrategy(id: string): Strategy | undefined {
  return strategies.find(strategy => strategy.id === id);
}

export function getStrategies(): Strategy[] {
  return strategies;
}

export * from './smaCrossover';
export * from './rsi';
export * from './bollingerBreakout';
export * from './meanReversion';
export * from './gaussianStochastic';
export * from './gaussianStochasticOptimized';
export * from './lorentzianClassification'; 