/// <reference lib="webworker" />

import type { OHLCV, Position } from '@/types/trading';

function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(0);
      continue;
    }
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = new Array(prices.length).fill(0);
  ema[0] = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema[i] = (prices[i] * k) + (ema[i - 1] * (1 - k));
  }
  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = new Array(prices.length).fill(0);
  const gains: number[] = new Array(prices.length).fill(0);
  const losses: number[] = new Array(prices.length).fill(0);

  // Calculer les gains et pertes
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    gains[i] = diff > 0 ? diff : 0;
    losses[i] = diff < 0 ? -diff : 0;
  }

  // Calculer les moyennes
  let avgGain = gains.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;

  // Premier RSI
  rsi[period] = 100 - (100 / (1 + avgGain / (avgLoss || 1)));

  // Calculer le reste des RSI
  for (let i = period + 1; i < prices.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rsi[i] = 100 - (100 / (1 + avgGain / (avgLoss || 1)));
  }

  return rsi;
}

function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number[], middle: number[], lower: number[] } {
  const sma = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(0);
      lower.push(0);
      continue;
    }

    const slice = prices.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    upper.push(mean + stdDev * std);
    lower.push(mean - stdDev * std);
  }

  return { upper, middle: sma, lower };
}

function calculateStochastic(data: OHLCV[], period: number = 14, smoothK: number = 3): { stochK: number[], stochD: number[] } {
  const stochK: number[] = new Array(data.length).fill(0);
  const stochD: number[] = new Array(data.length).fill(0);

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const high = Math.max(...slice.map(d => d.high));
    const low = Math.min(...slice.map(d => d.low));
    const close = data[i].close;

    stochK[i] = ((close - low) / (high - low)) * 100;
  }

  // Calculer stochD (moyenne mobile de stochK)
  for (let i = smoothK - 1; i < data.length; i++) {
    const sum = stochK.slice(i - smoothK + 1, i + 1).reduce((a, b) => a + b, 0);
    stochD[i] = sum / smoothK;
  }

  return { stochK, stochD };
}

function calculateATR(data: OHLCV[], period: number = 14): number[] {
  const tr: number[] = new Array(data.length).fill(0);
  const atr: number[] = new Array(data.length).fill(0);

  // Calculer True Range
  tr[0] = data[0].high - data[0].low;
  for (let i = 1; i < data.length; i++) {
    tr[i] = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
  }

  // Calculer ATR
  atr[period - 1] = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < data.length; i++) {
    atr[i] = ((atr[i - 1] * (period - 1)) + tr[i]) / period;
  }

  return atr;
}

function calculateIndicators(data: OHLCV[], onProgress?: (step: string, progress: number) => void): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  const prices = data.map(d => d.close);

  // Bandes de Bollinger
  onProgress?.('Calcul des bandes de Bollinger', 20);
  const bb = calculateBollingerBands(prices, 20, 2);
  result.upper = bb.upper;
  result.middle = bb.middle;
  result.lower = bb.lower;

  // RSI
  onProgress?.('Calcul du RSI', 40);
  result.rsi = calculateRSI(prices, 14);

  // Stochastique
  onProgress?.('Calcul du Stochastique', 60);
  const stoch = calculateStochastic(data, 14, 3);
  result.stochK = stoch.stochK;
  result.stochD = stoch.stochD;

  // EMA 50
  onProgress?.('Calcul de l\'EMA', 80);
  result.ema50 = calculateEMA(prices, 50);

  // ATR
  onProgress?.('Calcul de l\'ATR', 90);
  result.atr = calculateATR(data, 14);

  onProgress?.('Calculs terminés', 100);
  return result;
}

interface WorkerMessage {
  data: OHLCV[];
  strategy: {
    id: string;
    name: string;
    type: string;
    description: string;
    indicators: any[];
    execute: string;
    calculate: string;
  };
  initialBalance: number;
  minDecisionInterval: number;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { data, strategy, initialBalance } = e.data;
  let balance = initialBalance;
  let positions: Position[] = [];
  let returns: number[] = [];
  let maxDrawdown = 0;
  let peak = initialBalance;
  let trades: { type: 'long' | 'short'; entry: number; exit: number; profit: number; timestamp: number; reason?: string }[] = [];

  try {
    const progressHandler = (step: string, progress: number) => {
      self.postMessage({ 
        type: 'progress', 
        step, 
        progress,
        data: {
          trades,
          returns,
          maxDrawdown,
          currentBalance: balance,
          positions
        }
      });
    };

    // Recréer les fonctions de la stratégie de manière sécurisée
    let strategyFunctions;
    try {
      const executeFunc = new Function('return ' + strategy.execute)();
      const calculateFunc = strategy.calculate ? new Function('return ' + strategy.calculate)() : calculateIndicators;

      strategyFunctions = {
        execute: executeFunc,
        calculate: calculateFunc
      };
    } catch (error) {
      console.error('Erreur lors de la création des fonctions de stratégie:', error);
      throw new Error('Erreur lors de la création des fonctions de stratégie');
    }

    // Calculer les indicateurs avec la fonction de la stratégie
    progressHandler('Calcul des indicateurs', 10);
    let indicators: Record<string, number[]>;
    try {
      indicators = await strategyFunctions.calculate(data, progressHandler);
      
      if (!indicators || typeof indicators !== 'object') {
        throw new Error('Les indicateurs calculés sont invalides');
      }

      // Vérifier que tous les indicateurs nécessaires sont présents
      const requiredIndicators = ['upper', 'middle', 'lower', 'stochK', 'stochD', 'rsi', 'ema50', 'atr'];
      const missingIndicators = requiredIndicators.filter(indicator => 
        !indicators[indicator] || !Array.isArray(indicators[indicator])
      );

      if (missingIndicators.length > 0) {
        console.warn('Indicateurs manquants:', missingIndicators);
        // Calculer les indicateurs manquants
        const defaultIndicators = calculateIndicators(data);
        missingIndicators.forEach(indicator => {
          indicators[indicator] = defaultIndicators[indicator];
        });
      }

      // Envoyer les indicateurs calculés
      self.postMessage({
        type: 'indicators',
        data: indicators
      });

    } catch (error) {
      console.error('Erreur lors du calcul des indicateurs:', error);
      // En cas d'erreur, utiliser la fonction de calcul par défaut
      indicators = calculateIndicators(data);
      self.postMessage({
        type: 'indicators',
        data: indicators
      });
    }

    // Simuler le trading sur chaque point de données
    const totalPoints = data.length;
    let lastProgress = 20;
    const updateInterval = Math.max(1, Math.floor(totalPoints / 100)); // Mise à jour tous les 1% de progression

    for (let i = 50; i < totalPoints; i++) {
      const currentProgress = Math.floor((i / totalPoints) * 60) + 20;
      
      // Envoyer des mises à jour régulières
      if (i % updateInterval === 0 || currentProgress > lastProgress) {
        progressHandler('Simulation des trades', currentProgress);
        lastProgress = currentProgress;
      }

      const candle = data[i];
      const currentPosition = positions[positions.length - 1];
      
      // Préparer les indicateurs pour ce point de données
      const currentIndicators = Object.entries(indicators).reduce((acc, [key, values]) => {
        if (Array.isArray(values)) {
          acc[key] = values[i];
        }
        return acc;
      }, {} as Record<string, number>);

      // Exécuter la stratégie
      const result = strategyFunctions.execute(data.slice(0, i + 1), currentPosition, currentIndicators);

      if (result.signal === 'buy' && !currentPosition) {
        const price = result.price || candle.close;
        const quantity = balance / price;
        positions.push({
          symbol: '',
          side: 'LONG',
          entryPrice: price,
          quantity,
          unrealizedPnL: 0,
          timestamp: candle.timestamp,
          stopLoss: result.stopLoss,
          takeProfit: result.takeProfit
        });
      } else if (result.signal === 'sell' && currentPosition) {
        const exitPrice = result.price || candle.close;
        const pnl = ((exitPrice - currentPosition.entryPrice) / currentPosition.entryPrice) * balance;
        balance += pnl;

        trades.push({
          type: 'long',
          entry: currentPosition.entryPrice,
          exit: exitPrice,
          profit: pnl,
          timestamp: candle.timestamp,
          reason: result.reason
        });

        positions.pop();
      }

      // Calculer les métriques
      const currentValue = balance + (currentPosition ? 
        (candle.close - currentPosition.entryPrice) * currentPosition.quantity : 0);

      returns.push((currentValue - peak) / peak);
      
      if (currentValue > peak) {
        peak = currentValue;
      } else {
        const drawdown = (peak - currentValue) / peak;
        maxDrawdown = Math.min(maxDrawdown, -drawdown);
      }
    }

    // Calculer les métriques finales
    const finalValue = balance + (positions[0] ? 
      (data[data.length - 1].close - positions[0].entryPrice) * positions[0].quantity : 0);
    const totalReturn = (finalValue - initialBalance) / initialBalance;
    const sharpeRatio = calculateSharpeRatio(returns);

    self.postMessage({
      type: 'result',
      result: {
        initialBalance,
        finalBalance: finalValue,
        totalReturn,
        maxDrawdown,
        sharpeRatio,
        trades,
        indicators
      }
    });

  } catch (error) {
    console.error('Erreur dans le worker de backtest:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
};

function calculateSharpeRatio(returns: number[]): number {
  if (returns.length < 2) return 0;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);

  // Assuming risk-free rate of 0% for simplicity
  return mean / stdDev * Math.sqrt(252); // Annualized Sharpe Ratio
} 