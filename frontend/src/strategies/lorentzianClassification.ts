import type { OHLCV, Strategy, Position, StrategyType } from '@/types/trading';

type ProgressCallback = (step: string, progress: number) => void;

function calculateLorentzianDistance(x1: number[], x2: number[]): number {
  let sum = 0;
  for (let i = 0; i < x1.length; i++) {
    const diff = x1[i] - x2[i];
    sum += Math.log(1 + Math.abs(diff));
  }
  return sum;
}

function calculateFeatures(data: OHLCV[], lookback: number): number[][] {
  const features: number[][] = [];
  
  for (let i = lookback; i < data.length; i++) {
    const window = data.slice(i - lookback, i);
    const returns = window.map((candle, j) => 
      j > 0 ? (candle.close - window[j-1].close) / window[j-1].close : 0
    );
    
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / lookback);
    const momentum = (data[i].close - data[i - lookback].close) / data[i - lookback].close;
    const volume_change = (data[i].volume - data[i - lookback].volume) / data[i - lookback].volume;
    
    features.push([
      returns[returns.length - 1],
      volatility,
      momentum,
      volume_change
    ]);
  }
  
  return features;
}

function normalizeFeatures(features: number[][]): number[][] {
  const numFeatures = features[0].length;
  const mins = new Array(numFeatures).fill(Infinity);
  const maxs = new Array(numFeatures).fill(-Infinity);
  
  // Trouver min et max pour chaque feature
  for (const sample of features) {
    for (let i = 0; i < numFeatures; i++) {
      mins[i] = Math.min(mins[i], sample[i]);
      maxs[i] = Math.max(maxs[i], sample[i]);
    }
  }
  
  // Normaliser
  return features.map(sample => 
    sample.map((value, i) => 
      maxs[i] === mins[i] ? 0 : (value - mins[i]) / (maxs[i] - mins[i])
    )
  );
}

function classifyPrice(features: number[][], k: number = 5): number[] {
  const normalizedFeatures = normalizeFeatures(features);
  const predictions: number[] = [];
  
  for (let i = k; i < normalizedFeatures.length; i++) {
    const currentPoint = normalizedFeatures[i];
    const neighbors = normalizedFeatures.slice(i - k, i);
    
    let upVotes = 0;
    let downVotes = 0;
    
    for (let j = 0; j < neighbors.length; j++) {
      const distance = calculateLorentzianDistance(currentPoint, neighbors[j]);
      const priceDiff = features[i - k + j + 1][0] - features[i - k + j][0];
      
      if (priceDiff > 0) {
        upVotes += 1 / (1 + distance);
      } else {
        downVotes += 1 / (1 + distance);
      }
    }
    
    predictions.push(upVotes > downVotes ? 1 : -1);
  }
  
  return predictions;
}

function calculateIndicators(data: OHLCV[], onProgress?: ProgressCallback | null) {
  const safeProgress = (step: string, progress: number) => {
    if (typeof onProgress === 'function') {
      try {
        onProgress(step, progress);
      } catch (error) {
        console.warn('Erreur lors de la mise à jour de la progression:', error);
      }
    }
  };

  try {
    safeProgress('Préparation des données', 10);
    const lookback = 20;
    const features = calculateFeatures(data, lookback);
    
    safeProgress('Calcul des caractéristiques', 40);
    const predictions = classifyPrice(features);
    
    safeProgress('Classification des prix', 70);
    
    // Créer les signaux
    const signals = new Array(data.length).fill(0);
    for (let i = 0; i < predictions.length; i++) {
      signals[i + lookback + 5] = predictions[i];
    }
    
    // Calculer les bandes de confiance
    const confidenceBands = signals.map((signal, i) => {
      if (i < lookback + 5) return { upper: data[i].high, lower: data[i].low };
      
      const window = data.slice(i - lookback, i);
      const std = Math.sqrt(
        window.reduce((sum, candle) => 
          sum + Math.pow(candle.close - window[0].close, 2), 0
        ) / lookback
      );
      
      return {
        upper: data[i].close + 2 * std,
        lower: data[i].close - 2 * std
      };
    });
    
    safeProgress('Calcul des indicateurs terminé', 100);
    
    return {
      signals,
      upper: confidenceBands.map(band => band.upper),
      lower: confidenceBands.map(band => band.lower),
      predictions: [...new Array(lookback + 5).fill(0), ...predictions]
    };
  } catch (error) {
    console.error('Erreur lors du calcul des indicateurs:', error);
    throw error;
  }
}

export const lorentzianClassificationStrategy: Strategy = {
  id: 'lorentzian-classification',
  name: 'Classification Lorentzienne',
  description: 'Stratégie de trading basée sur la classification Lorentzienne des mouvements de prix',
  type: 'machine-learning' as StrategyType,
  minDecisionInterval: 60000, // 1 minute
  indicators: [
    { name: 'Signals', type: 'CUSTOM', params: { lookback: 20 } },
    { name: 'ConfidenceBands', type: 'CUSTOM', params: { stdDev: 2 } }
  ],
  calculate: calculateIndicators,
  execute: (data: OHLCV[], currentPosition: Position | null, indicators: Record<string, number[]>) => {
    if (!indicators.signals || !indicators.upper || !indicators.lower) {
      return { signal: 'hold' as const, probability: 0.5 };
    }

    const lastIndex = data.length - 1;
    const signal = indicators.signals[lastIndex];
    const price = data[lastIndex].close;
    const upper = indicators.upper[lastIndex];
    const lower = indicators.lower[lastIndex];

    // Calculer la probabilité basée sur la distance aux bandes de confiance
    const bandWidth = upper - lower;
    const relativePosition = (price - lower) / bandWidth;
    const probability = Math.max(0.1, Math.min(0.9, relativePosition));

    if (!currentPosition) {
      if (signal > 0 && price < upper) {
        return {
          signal: 'buy' as const,
          price,
          stopLoss: lower,
          takeProfit: upper + bandWidth,
          probability: probability
        };
      }
    } else {
      if (signal < 0 || price > upper) {
        return {
          signal: 'sell' as const,
          price,
          reason: 'signal' as const,
          probability: 1 - probability
        };
      }

      // Trailing stop
      const trailingStop = Math.max(lower, currentPosition.entryPrice * 0.99);
      if (price < trailingStop) {
        return {
          signal: 'sell' as const,
          price,
          reason: 'trailing_stop' as const,
          probability: 0.8
        };
      }
    }

    return { 
      signal: 'hold' as const,
      probability: 0.5
    };
  }
}; 