import type { Strategy, IndicatorParams } from '@/types/trading';

interface PinescriptIndicator {
  name: string;
  type: string;
  params: Record<string, number>;
}

interface ParsedPinescript {
  name: string;
  description: string;
  type: 'trend' | 'momentum' | 'breakout' | 'mean-reversion' | 'machine-learning';
  indicators: PinescriptIndicator[];
  executeCode: string;
  calculateCode: string;
}

export class PinescriptConverter {
  private static extractMetadata(code: string): { name: string; description: string } {
    const nameMatch = code.match(/\/\/\s*@name\s+(.+)/);
    const descMatch = code.match(/\/\/\s*@description\s+(.+)/);
    
    return {
      name: nameMatch?.[1] || 'Imported Strategy',
      description: descMatch?.[1] || 'Imported from TradingView'
    };
  }

  private static extractIndicators(code: string): PinescriptIndicator[] {
    const indicators: PinescriptIndicator[] = [];
    const addedIndicators = new Set<string>();

    const addIndicator = (name: string, type: string, params: Record<string, number>) => {
      const key = `${type}-${Object.values(params).join('-')}`;
      if (!addedIndicators.has(key)) {
        indicators.push({ name, type, params });
        addedIndicators.add(key);
      }
    };
    
    // Extraire les indicateurs standards
    Array.from(code.matchAll(/sma\((.*?),\s*(\d+)\)/g)).forEach(match => {
      const period = parseInt(match[2]);
      addIndicator(`SMA${period}`, 'SMA', { period });
    });

    Array.from(code.matchAll(/rsi\((.*?),\s*(\d+)\)/g)).forEach(match => {
      const period = parseInt(match[2]);
      addIndicator(`RSI${period}`, 'RSI', { period });
    });

    Array.from(code.matchAll(/macd\((.*?),\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/g)).forEach(match => {
      const [_, __, fastPeriod, slowPeriod, signalPeriod] = match.map(Number);
      addIndicator('MACD', 'MACD', { fastPeriod, slowPeriod, signalPeriod });
    });

    Array.from(code.matchAll(/bb\((.*?),\s*(\d+)\s*,\s*(\d+)\)/g)).forEach(match => {
      const [_, __, period, stdDev] = match.map(Number);
      addIndicator('BB', 'BB', { period, stdDev });
    });

    return indicators;
  }

  private static determineStrategyType(code: string): Strategy['type'] {
    if (code.includes('machine_learning') || code.includes('ml.')) {
      return 'trend'; // Changé pour éviter l'erreur de type
    }
    if (code.includes('crossover') || code.includes('crosses')) {
      return 'trend';
    }
    if (code.includes('rsi') || code.includes('momentum')) {
      return 'momentum';
    }
    if (code.includes('breakout') || code.includes('breaks')) {
      return 'breakout';
    }
    if (code.includes('mean') || code.includes('reversion')) {
      return 'mean-reversion';
    }
    return 'trend';
  }

  private static generateExecuteFunction(code: string, extractedIndicators: PinescriptIndicator[]): string {
    // Créer les variables pour chaque indicateur
    const indicatorVars = extractedIndicators.map(ind => 
      `const ${ind.name} = indicators['${ind.name}'];`
    ).join('\n');

    // Convertir les conditions d'entrée/sortie en TypeScript
    let executeCode = `
      const lastCandle = data[data.length - 1];
      const prevCandle = data[data.length - 2];
      
      // Récupérer les valeurs des indicateurs
      ${indicatorVars}
      
      // Conditions d'entrée
      if (!currentPosition) {
        ${this.convertEntryConditions(code, extractedIndicators)}
      } else {
        ${this.convertExitConditions(code, extractedIndicators)}
      }
      
      return { signal: 'hold' };
    `;

    return executeCode;
  }

  private static convertEntryConditions(code: string, indicators: PinescriptIndicator[]): string {
    let conditions = '';

    indicators.forEach(ind => {
      const varName = ind.name;
      const lastIndex = 'data.length - 1';
      const prevIndex = 'data.length - 2';

      switch (ind.type) {
        case 'SMA':
          if (code.includes('crosses above')) {
            conditions += `
              if (${varName}[${prevIndex}] <= indicators.slowMA[${prevIndex}] &&
                  ${varName}[${lastIndex}] > indicators.slowMA[${lastIndex}]) {
                return {
                  signal: 'buy',
                  price: lastCandle.close,
                  stopLoss: lastCandle.low * 0.99,
                  takeProfit: lastCandle.close * 1.02
                };
              }
            `;
          }
          break;

        case 'RSI':
          if (code.includes('oversold')) {
            conditions += `
              if (${varName}[${lastIndex}] < 30) {
                return {
                  signal: 'buy',
                  price: lastCandle.close,
                  stopLoss: lastCandle.low * 0.99,
                  takeProfit: lastCandle.close * 1.02
                };
              }
            `;
          }
          break;
      }
    });

    return conditions || 'return { signal: "hold" };';
  }

  private static convertExitConditions(code: string, indicators: PinescriptIndicator[]): string {
    let conditions = '';

    indicators.forEach(ind => {
      const varName = ind.name;
      const lastIndex = 'data.length - 1';
      const prevIndex = 'data.length - 2';

      switch (ind.type) {
        case 'SMA':
          if (code.includes('crosses below')) {
            conditions += `
              if (${varName}[${prevIndex}] >= indicators.slowMA[${prevIndex}] &&
                  ${varName}[${lastIndex}] < indicators.slowMA[${lastIndex}]) {
                return {
                  signal: 'sell',
                  price: lastCandle.close,
                  reason: 'signal'
                };
              }
            `;
          }
          break;

        case 'RSI':
          if (code.includes('overbought')) {
            conditions += `
              if (${varName}[${lastIndex}] > 70) {
                return {
                  signal: 'sell',
                  price: lastCandle.close,
                  reason: 'signal'
                };
              }
            `;
          }
          break;
      }
    });

    return conditions || `
      // Stop loss et take profit par défaut
      if (lastCandle.low <= currentPosition.stopLoss) {
        return {
          signal: 'sell',
          price: currentPosition.stopLoss,
          reason: 'stop_loss'
        };
      }
      if (lastCandle.high >= currentPosition.takeProfit) {
        return {
          signal: 'sell',
          price: currentPosition.takeProfit,
          reason: 'take_profit'
        };
      }
      return { signal: 'hold' };
    `;
  }

  public static convertToStrategy(pinescriptCode: string): Strategy {
    const metadata = this.extractMetadata(pinescriptCode);
    const extractedIndicators = this.extractIndicators(pinescriptCode);
    const type = this.determineStrategyType(pinescriptCode);
    const executeCode = this.generateExecuteFunction(pinescriptCode, extractedIndicators);

    // Créer une nouvelle stratégie
    const strategy: Strategy = {
      id: `imported_${Date.now()}`,
      name: metadata.name,
      description: metadata.description,
      type,
      indicators: extractedIndicators.map(ind => ({
        name: ind.name,
        type: ind.type,
        params: ind.params
      })),
      minDecisionInterval: 60000,
      execute: new Function('data', 'currentPosition', 'indicators', executeCode) as any,
      calculate: (data) => {
        const result: Record<string, number[]> = {};
        extractedIndicators.forEach(ind => {
          switch (ind.type) {
            case 'SMA':
              result[ind.name] = this.calculateSMA(data.map(d => d.close), ind.params.period);
              break;
            case 'RSI':
              result[ind.name] = this.calculateRSI(data.map(d => d.close), ind.params.period);
              break;
            case 'MACD':
              // TODO: Implémenter MACD
              break;
            case 'BB':
              // TODO: Implémenter Bollinger Bands
              break;
          }
        });
        return result;
      }
    };

    return strategy;
  }

  private static calculateSMA(prices: number[], period: number): number[] {
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

  private static calculateRSI(prices: number[], period: number): number[] {
    const rsi: number[] = new Array(prices.length).fill(0);
    const gains: number[] = new Array(prices.length).fill(0);
    const losses: number[] = new Array(prices.length).fill(0);

    for (let i = 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      gains[i] = diff > 0 ? diff : 0;
      losses[i] = diff < 0 ? -diff : 0;
    }

    let avgGain = gains.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;

    rsi[period] = 100 - (100 / (1 + avgGain / (avgLoss || 1)));

    for (let i = period + 1; i < prices.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      rsi[i] = 100 - (100 / (1 + avgGain / (avgLoss || 1)));
    }

    return rsi;
  }
} 