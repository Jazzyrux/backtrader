import { binanceService, type TimeFrame } from './binance';
import type { OHLCV, Strategy, BacktestResult, Position } from '@/types/trading';

interface WorkerMessage {
  type?: 'progress' | 'result';
  step?: string;
  progress?: number;
  positions: Position[];
  returns: number[];
  metrics: BacktestResult['metrics'];
}

interface PaginatedBacktestResult extends BacktestResult {
  currentPage: number;
  totalPages: number;
  positionsPerPage: number;
}

class TradingService {
  private positions: Map<string, Position[]> = new Map();
  private balances: Map<string, number> = new Map();
  private lastDecisionTimestamps: Map<string, number> = new Map();
  private readonly MIN_DECISION_INTERVAL = 30 * 1000; // 30 secondes en millisecondes
  private readonly POSITIONS_PER_PAGE = 20;

  private cache: Map<string, {
    positions: Position[];
    metrics: BacktestResult['metrics'];
    returns: number[];
    timestamp: number;
  }> = new Map();

  private getCacheKey(symbol: string, strategy: Strategy, startTime: number, endTime: number): string {
    return `${symbol}_${strategy.id}_${startTime}_${endTime}`;
  }

  async getHistoricalData(symbol: string, timeframe: TimeFrame): Promise<OHLCV[]> {
    return binanceService.getKlines(symbol, timeframe);
  }

  private canMakeDecision(symbol: string, timestamp: number): boolean {
    const lastDecision = this.lastDecisionTimestamps.get(symbol) || 0;
    return (timestamp - lastDecision) >= this.MIN_DECISION_INTERVAL;
  }

  private updateLastDecisionTimestamp(symbol: string, timestamp: number): void {
    this.lastDecisionTimestamps.set(symbol, timestamp);
  }

  async executeStrategy(
    symbol: string,
    strategy: Strategy,
    data: OHLCV[],
    balance: number,
    onPositionUpdate?: (position: Position | null) => void
  ): Promise<void> {
    if (!this.canMakeDecision(symbol, Date.now())) {
      return;
    }

    const currentPositions = this.positions.get(symbol) || [];
    const currentPosition = currentPositions[currentPositions.length - 1];

    // Convertir les données en intervalles de temps réguliers
    const normalizedData = this.normalizeTimeIntervals(data);
    const result = strategy.execute(normalizedData, currentPosition);

    if (result.signal === 'buy' && !currentPosition) {
      const price = result.price || normalizedData[normalizedData.length - 1].close;
      const quantity = (balance * 0.95) / price;

      const newPosition: Position = {
        symbol,
        side: 'LONG',
        entryPrice: price,
        quantity,
        unrealizedPnL: 0,
        timestamp: result.timestamp || Date.now(),
        stopLoss: result.stopLoss,
        takeProfit: result.takeProfit
      };

      currentPositions.push(newPosition);
      this.positions.set(symbol, currentPositions);
      onPositionUpdate?.(newPosition);
      this.updateLastDecisionTimestamp(symbol, Date.now());

    } else if (result.signal === 'sell' && currentPosition) {
      const exitPrice = result.price || normalizedData[normalizedData.length - 1].close;
      const pnl = ((exitPrice - currentPosition.entryPrice) / currentPosition.entryPrice) * 100;

      const updatedPosition: Position = {
        ...currentPosition,
        unrealizedPnL: pnl,
        exitPrice,
        exitTimestamp: result.timestamp || Date.now(),
        exitReason: result.reason || 'signal'
      };

      this.positions.set(symbol, currentPositions.slice(0, -1));
      onPositionUpdate?.(updatedPosition);
      this.updateLastDecisionTimestamp(symbol, Date.now());

      const currentBalance = this.balances.get(symbol) || balance;
      this.balances.set(symbol, currentBalance * (1 + pnl / 100));
    }
  }

  private normalizeTimeIntervals(data: OHLCV[]): OHLCV[] {
    if (data.length < 2) return data;

    const intervalSize = 1000; // 1 seconde en millisecondes
    const normalized: OHLCV[] = [];
    let currentInterval: OHLCV | null = null;

    for (const candle of data) {
      const intervalStart = Math.floor(candle.timestamp / intervalSize) * intervalSize;

      if (!currentInterval || currentInterval.timestamp !== intervalStart) {
        if (currentInterval) {
          normalized.push(currentInterval);
        }
        currentInterval = {
          timestamp: intervalStart,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume
        };
      } else {
        currentInterval.high = Math.max(currentInterval.high, candle.high);
        currentInterval.low = Math.min(currentInterval.low, candle.low);
        currentInterval.close = candle.close;
        currentInterval.volume += candle.volume;
      }
    }

    if (currentInterval) {
      normalized.push(currentInterval);
    }

    return normalized;
  }

  async backtestStrategy(
    symbol: string,
    _timeframe: TimeFrame,
    strategy: Strategy,
    initialBalance: number = 10000,
    startTime?: number,
    endTime?: number,
    page: number = 1,
    onProgress?: (step: string, progress: number) => void
  ): Promise<PaginatedBacktestResult> {
    const endTimeStamp = endTime || Date.now();
    const startTimeStamp = startTime || endTimeStamp - (365 * 24 * 60 * 60 * 1000);
    
    onProgress?.('Initialisation', 0);
    
    // Vérifier le cache
    const cacheKey = this.getCacheKey(symbol, strategy, startTimeStamp, endTimeStamp);
    const cachedResult = this.cache.get(cacheKey);
    
    if (cachedResult && Date.now() - cachedResult.timestamp < 5 * 60 * 1000) { // Cache de 5 minutes
      onProgress?.('Chargement depuis le cache', 100);
      // Paginer les résultats en cache
      const { positions, metrics, returns } = cachedResult;
      const totalPages = Math.ceil(positions.length / this.POSITIONS_PER_PAGE);
      const startIndex = (page - 1) * this.POSITIONS_PER_PAGE;
      const endIndex = startIndex + this.POSITIONS_PER_PAGE;
      const paginatedPositions = positions.slice(startIndex, endIndex);

      return {
        positions: this.formatPositions(paginatedPositions),
        metrics,
        returns,
        currentPage: page,
        totalPages,
        positionsPerPage: this.POSITIONS_PER_PAGE
      };
    }

    onProgress?.('Chargement des données', 20);
    // Récupérer les données à la seconde
    const data = await this.getHistoricalData(symbol, '1m');
    const filteredData = data.filter(d => d.timestamp >= startTimeStamp && d.timestamp <= endTimeStamp);
    
    onProgress?.('Exécution du backtest', 40);
    // Exécuter le backtest
    const result = await this.executeBacktest(filteredData, strategy, initialBalance, onProgress);
    
    onProgress?.('Finalisation', 90);
    // Mettre en cache les résultats
    this.cache.set(cacheKey, {
      ...result,
      timestamp: Date.now()
    });

    // Paginer les résultats
    const totalPages = Math.ceil(result.positions.length / this.POSITIONS_PER_PAGE);
    const startIndex = (page - 1) * this.POSITIONS_PER_PAGE;
    const endIndex = startIndex + this.POSITIONS_PER_PAGE;
    const paginatedPositions = result.positions.slice(startIndex, endIndex);

    onProgress?.('Terminé', 100);
    return {
      positions: this.formatPositions(paginatedPositions),
      metrics: result.metrics,
      returns: result.returns,
      currentPage: page,
      totalPages,
      positionsPerPage: this.POSITIONS_PER_PAGE
    };
  }

  private async executeBacktest(
    data: OHLCV[],
    strategy: Strategy,
    initialBalance: number,
    onProgress?: (step: string, progress: number) => void
  ): Promise<{
    positions: Position[];
    metrics: BacktestResult['metrics'];
    returns: number[];
  }> {
    return new Promise((resolve) => {
      const worker = new Worker(new URL('../workers/backtest.worker.ts', import.meta.url), {
        type: 'module'
      });

      worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        if (e.data.type === 'progress') {
          onProgress?.(e.data.step, e.data.progress);
        } else {
          const { positions, returns, metrics } = e.data;
          worker.terminate();
          resolve({ positions, metrics, returns });
        }
      };

      // Préparer les données pour le worker en ne gardant que les propriétés nécessaires
      const workerData = data.map(candle => ({
        timestamp: candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
      }));

      // Préparer la stratégie en ne gardant que les propriétés nécessaires
      const workerStrategy = {
        id: strategy.id,
        name: strategy.name,
        type: strategy.type,
        description: strategy.description,
        indicators: strategy.indicators,
        execute: strategy.execute.toString(), // Convertir la fonction en string
        calculate: strategy.calculate.toString() // Convertir la fonction en string
      };

      worker.postMessage({
        data: workerData,
        strategy: workerStrategy,
        initialBalance,
        minDecisionInterval: this.MIN_DECISION_INTERVAL
      });
    });
  }

  private formatPositions(positions: Position[]): BacktestResult['positions'] {
    return positions.map(p => ({
      type: p.side === 'LONG' ? 'long' : 'short',
      entry: p.entryPrice,
      exit: p.exitPrice!,
      profit: p.unrealizedPnL,
      timestamp: p.timestamp,
      stopLoss: p.stopLoss,
      takeProfit: p.takeProfit,
      reason: p.exitReason
    }));
  }
}

export const tradingService = new TradingService();