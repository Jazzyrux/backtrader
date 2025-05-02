import type { OHLCV, MarketInfo, Balance, Portfolio, BacktestResult, Position } from '@/types/trading';

export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M';

export class BinanceService {
  private baseUrl = '/api/binance';
  private wsBaseUrl = 'wss://stream.binance.com:9443/ws';
  private wsConnections = new Map<string, WebSocket>();
  private dataCache = new Map<string, OHLCV[]>();
  private subscribers = new Map<string, Set<(data: OHLCV[]) => void>>();
  private reconnectAttempts = new Map<string, number>();
  private maxReconnectAttempts = 5;
  private reconnectTimeouts = new Map<string, NodeJS.Timeout>();
  private marketData = new Map<string, MarketInfo>();
  private marketSubscribers = new Map<string, ((info: MarketInfo) => void)[]>();

  private timeframeToMilliseconds: Record<TimeFrame, number> = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1h': 3600000,
    '4h': 14400000,
    '1d': 86400000,
    '1w': 604800000,
    '1M': 2592000000
  };

  constructor() {
    // Nettoyage à la fermeture
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.cleanup());
    }
  }

  private formatSymbol(symbol: string): string {
    return symbol.toUpperCase().replace('/', '');
  }

  private getCacheKey(symbol: string, timeframe: TimeFrame): string {
    return `${symbol}-${timeframe}`;
  }

  private async initializeData(symbol: string, timeframe: TimeFrame): Promise<void> {
    const cacheKey = this.getCacheKey(symbol, timeframe);
    if (!this.dataCache.has(cacheKey)) {
      const historicalData = await this.getHistoricalData(symbol, timeframe);
      this.dataCache.set(cacheKey, historicalData);
    }
  }

  private updateCachedData(symbol: string, timeframe: TimeFrame, newCandle: OHLCV): void {
    const cacheKey = this.getCacheKey(symbol, timeframe);
    const cachedData = this.dataCache.get(cacheKey) || [];
    
    // Mettre à jour ou ajouter la nouvelle bougie
    const index = cachedData.findIndex(candle => candle.timestamp === newCandle.timestamp);
    if (index >= 0) {
      cachedData[index] = newCandle;
    } else {
      cachedData.push(newCandle);
      // Trier par timestamp et garder seulement les 1000 dernières bougies
      cachedData.sort((a, b) => a.timestamp - b.timestamp);
      if (cachedData.length > 1000) {
        cachedData.shift();
      }
    }

    this.dataCache.set(cacheKey, cachedData);
    
    // Notifier les abonnés
    const subscribers = this.subscribers.get(cacheKey);
    if (subscribers) {
      subscribers.forEach(callback => callback(cachedData));
    }
  }

  async getMarketInfo(symbol: string): Promise<MarketInfo> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const response = await fetch(`${this.baseUrl}/ticker/24hr?symbol=${formattedSymbol}`);
      const data = await response.json();

      return {
          symbol: symbol,
        price: parseFloat(data.lastPrice),
        priceChange: parseFloat(data.priceChange),
        priceChangePercent: parseFloat(data.priceChangePercent),
        volume: parseFloat(data.volume),
        high24h: parseFloat(data.highPrice),
        low24h: parseFloat(data.lowPrice)
      };
    } catch (error) {
      console.error('Error fetching market info:', error);
      throw error;
    }
  }

  subscribe(callback: (data: Map<string, MarketInfo>) => void) {
    this.marketData.forEach((marketInfo, symbol) => {
      callback(new Map([[symbol, marketInfo]]));
    });
  }

  async getKlines(
    symbol: string,
    timeframe: TimeFrame | string,
    startTime?: number,
    endTime?: number,
    limit: number = 500
  ): Promise<OHLCV[]> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const params = new URLSearchParams({
        symbol: formattedSymbol,
        interval: timeframe,
        limit: limit.toString()
      });

      if (startTime) params.append('startTime', startTime.toString());
      if (endTime) params.append('endTime', endTime.toString());

      const response = await fetch(`${this.baseUrl}/klines?${params}`);
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Échec de la requête : ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      return data.map((candle: any[]) => ({
        timestamp: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
    } catch (error) {
      console.error('Error fetching klines:', error);
      throw error;
    }
  }

  getDataForTimeframe(symbol: string): OHLCV[] {
    const formattedSymbol = this.formatSymbol(symbol);
    const data = this.marketData.get(formattedSymbol);
    if (!data) return [];
    return [];
  }

  async getFullHistory(symbol: string): Promise<OHLCV[]> {
    try {
      const data = await this.getKlines(symbol, '1d');
      return this.mergeTimeframes(data);
    } catch (error) {
      console.error('Error fetching full history:', error);
      throw error;
    }
  }

  subscribeToUpdates(symbol: string, handler: (data: OHLCV[]) => void): () => void {
    const formattedSymbol = this.formatSymbol(symbol);
    if (!this.subscribers.has(formattedSymbol)) {
      this.subscribers.set(formattedSymbol, new Set());
    }
    this.subscribers.get(formattedSymbol)!.add(handler);
    return () => {
      const subscribers = this.subscribers.get(formattedSymbol);
      if (subscribers) {
        subscribers.delete(handler);
        if (subscribers.size === 0) {
          this.subscribers.delete(formattedSymbol);
          this.cleanup(formattedSymbol);
        }
      }
    };
  }

  private startWebSocket(wsKey: string) {
    if (this.wsConnections.has(wsKey)) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ws = new WebSocket(`${this.wsBaseUrl}/${wsKey}`);
    this.wsConnections.set(wsKey, ws);
      
    ws.onopen = () => {
      console.log(`WebSocket connected: ${wsKey}`);
      this.reconnectAttempts.delete(wsKey);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMarketUpdate(wsKey.split('@')[0], data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for ${wsKey}:`, error);
    };

    ws.onclose = () => {
      console.log(`WebSocket closed: ${wsKey}`);
      this.handleReconnect(wsKey);
    };
  }

  private handleReconnect(wsKey: string) {
    const attempts = this.reconnectAttempts.get(wsKey) || 0;
    if (attempts < this.maxReconnectAttempts) {
      const timeout = this.reconnectTimeouts.get(wsKey);
      if (timeout) {
        clearTimeout(timeout);
      }

      const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
      const newTimeout = setTimeout(() => {
        this.reconnectAttempts.set(wsKey, attempts + 1);
        this.startWebSocket(wsKey);
      }, delay);

      this.reconnectTimeouts.set(wsKey, newTimeout);
    }
  }

  private mergeTimeframes(data: OHLCV[]): OHLCV[] {
    return data.sort((a, b) => a.timestamp - b.timestamp);
  }

  private async handleApiError(error: any, retryCount = 0): Promise<never> {
    console.error('Erreur API Binance:', error);
    
    if (retryCount < 3) {
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
      return this.handleApiError(error, retryCount + 1);
    }
    
    throw new Error(`Erreur API Binance: ${error.message || 'Erreur inconnue'}`);
  }

  async getHistoricalData(symbol: string, timeframe: TimeFrame): Promise<OHLCV[]> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const now = Date.now();
      const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
      
      let allData: OHLCV[] = [];
      let startTime = oneYearAgo;
      const limit = 1000;

      while (startTime < now) {
        try {
          const params = new URLSearchParams({
            symbol: formattedSymbol,
            interval: timeframe,
            startTime: startTime.toString(),
            limit: limit.toString()
          });

          const response = await fetch(`${this.baseUrl}/klines?${params}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'TraderTest/1.0.0',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS'
            }
          });

          if (!response.ok) {
            if (response.status === 429) {
              // Rate limit atteint, attendre et réessayer
              await new Promise(resolve => setTimeout(resolve, 5000));
              continue;
            }
            throw new Error(`Erreur lors de la récupération des données: ${response.statusText}`);
          }

          const data = await response.json();
          if (data.length === 0) break;

          const formattedData = data.map((candle: any[]) => ({
            timestamp: candle[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
          }));

          allData = [...allData, ...formattedData];
          
          // Mettre à jour startTime pour la prochaine itération
          const lastTimestamp = formattedData[formattedData.length - 1].timestamp;
          startTime = lastTimestamp + this.timeframeToMilliseconds[timeframe];
          
          // Ajouter un délai entre les requêtes pour éviter le rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error('Erreur lors de la récupération des données:', error);
          throw error;
        }
      }

      // Dédupliquer et trier les données
      const uniqueData = Array.from(
        new Map(allData.map(item => [item.timestamp, item])).values()
      ).sort((a, b) => a.timestamp - b.timestamp);

      return uniqueData;
    } catch (error) {
      console.error('Erreur dans getHistoricalData:', error);
      throw error;
    }
  }

  async getMarketPrice(symbol: string): Promise<number> {
    const marketInfo = await this.getMarketInfo(symbol);
    return marketInfo.price;
  }

  subscribeToKlines(symbol: string, timeframe: TimeFrame, callback: (data: OHLCV[]) => void): () => void {
    const formattedSymbol = this.formatSymbol(symbol).toLowerCase();
    const cacheKey = this.getCacheKey(symbol, timeframe);
    const wsKey = `${formattedSymbol}@kline_${timeframe}`;

    // Ajouter le subscriber
    if (!this.subscribers.has(cacheKey)) {
      this.subscribers.set(cacheKey, new Set());
    }
    this.subscribers.get(cacheKey)!.add(callback);

    // Initialiser les données si nécessaire
    this.initializeData(symbol, timeframe).then(() => {
      // Envoyer les données initiales
      const cachedData = this.dataCache.get(cacheKey);
      if (cachedData) {
        callback(cachedData);
      }

      // Établir la connexion WebSocket si elle n'existe pas
      if (!this.wsConnections.has(wsKey)) {
        const ws = new WebSocket(`${this.wsBaseUrl}/${wsKey}`);
        this.wsConnections.set(wsKey, ws);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.k) {
              const kline = data.k;
              const candle: OHLCV = {
                timestamp: kline.t,
                open: parseFloat(kline.o),
                high: parseFloat(kline.h),
                low: parseFloat(kline.l),
                close: parseFloat(kline.c),
                volume: parseFloat(kline.v)
              };
              this.updateCachedData(symbol, timeframe, candle);
            }
          } catch (error) {
            console.error('Erreur lors du traitement des données WebSocket:', error);
          }
        };

        ws.onerror = (error) => {
          console.error(`Erreur WebSocket pour ${wsKey}:`, error);
          this.handleReconnect(wsKey);
        };

        ws.onclose = () => {
          console.log(`WebSocket fermé: ${wsKey}`);
          this.handleReconnect(wsKey);
        };
      }
    });

    // Retourner la fonction de nettoyage
    return () => {
      const subscribers = this.subscribers.get(cacheKey);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.cleanup(wsKey);
          this.subscribers.delete(cacheKey);
          this.dataCache.delete(cacheKey);
        }
      }
    };
  }

  private cleanup(wsKey?: string): void {
    if (wsKey) {
      // Nettoyer une connexion spécifique
      const ws = this.wsConnections.get(wsKey);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        this.wsConnections.delete(wsKey);
      }

      const timeout = this.reconnectTimeouts.get(wsKey);
      if (timeout) {
        clearTimeout(timeout);
        this.reconnectTimeouts.delete(wsKey);
      }
      this.reconnectAttempts.delete(wsKey);
    } else {
      // Nettoyer toutes les connexions
      this.wsConnections.forEach((ws, key) => {
        this.cleanup(key);
      });
      this.wsConnections.clear();
      this.subscribers.clear();
      this.dataCache.clear();
      this.reconnectAttempts.clear();
      this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
      this.reconnectTimeouts.clear();
    }
  }

  public closeAllConnections() {
    const wsKeys = Array.from(this.wsConnections.keys());
    wsKeys.forEach(key => {
      this.cleanup(key);
    });
  }

  public subscribeToTicker(
    symbol: string,
    onUpdate: (data: MarketInfo) => void
  ): () => void {
    const formattedSymbol = this.formatSymbol(symbol).toLowerCase();
    const wsKey = `${formattedSymbol}@ticker`;

    // Créer un nouvel ensemble de subscribers si nécessaire
    if (!this.marketSubscribers.has(wsKey)) {
      this.marketSubscribers.set(wsKey, []);
    }

    // Ajouter le nouveau subscriber
    this.marketSubscribers.get(wsKey)?.push(onUpdate);

    // Si c'est le premier subscriber, démarrer la connexion WebSocket
    if (this.marketSubscribers.get(wsKey)?.length === 1) {
      this.startWebSocket(wsKey);
    }

    // Retourner la fonction de nettoyage
    return () => {
      const subscribers = this.marketSubscribers.get(wsKey);
      if (subscribers) {
        const index = subscribers.indexOf(onUpdate);
        if (index > -1) {
          subscribers.splice(index, 1);
        }

        // Si c'était le dernier subscriber, nettoyer la connexion
        if (subscribers.length === 0) {
          this.cleanup(wsKey);
          this.marketSubscribers.delete(wsKey);
        }
      }
    };
  }

  private handleMarketUpdate(symbol: string, data: any): void {
    const marketInfo: MarketInfo = {
      symbol,
      price: parseFloat(data.c),
      priceChange: parseFloat(data.p),
      priceChangePercent: parseFloat(data.P),
      volume: parseFloat(data.v),
      high24h: parseFloat(data.h),
      low24h: parseFloat(data.l)
    };

    this.marketData.set(symbol, marketInfo);
    
    // Notifier les abonnés du ticker
    const subscribers = this.marketSubscribers.get(`${symbol.toLowerCase()}@ticker`);
    if (subscribers) {
      subscribers.forEach(callback => callback(marketInfo));
    }
  }

  async getMarketData(symbol: string): Promise<MarketInfo | null> {
    try {
      const formattedSymbol = this.formatSymbol(symbol);
      const response = await fetch(`${this.baseUrl}/ticker/24hr?symbol=${formattedSymbol}`);
      const data = await response.json();

      return {
        symbol,
        price: parseFloat(data.lastPrice),
        priceChange: parseFloat(data.priceChange),
        priceChangePercent: parseFloat(data.priceChangePercent),
        volume: parseFloat(data.volume),
        high24h: parseFloat(data.highPrice),
        low24h: parseFloat(data.lowPrice)
      };
    } catch (error) {
      console.error('Error fetching market data:', error);
      return null;
    }
  }

  async getBalance(): Promise<Balance[]> {
    // Simulation de soldes pour le moment
    return [
      { asset: 'USDT', free: 10000, used: 0, total: 10000 },
      { asset: 'BTC', free: 0.5, used: 0, total: 0.5 }
    ];
  }

  async getPortfolio(): Promise<Portfolio> {
    try {
      const balances = await this.getBalance();
      const positions = await Promise.all(
        balances
          .filter(balance => balance.total > 0)
          .map(async balance => {
            const marketData = await this.getMarketData(`${balance.asset}USDT`);
            return {
              symbol: balance.asset,
              amount: balance.total,
              value: balance.total * (marketData?.price ?? 0),
              pnl24h: marketData?.priceChangePercent ?? 0
            };
          })
      );

      return {
        totalValue: positions.reduce((sum, pos) => sum + pos.value, 0),
        pnl24h: positions.reduce((sum, pos) => sum + (pos.value * pos.pnl24h / 100), 0),
        positions
      };
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      return { totalValue: 0, pnl24h: 0, positions: [] };
    }
  }

  public getTimeframeMilliseconds(timeframe: TimeFrame): number {
    return this.timeframeToMilliseconds[timeframe];
  }

  public async backtestStrategy({
    symbol,
    strategy,
    data,
    initialBalance
  }: {
    symbol: string;
    strategy: string;
    data: OHLCV[];
    initialBalance: number;
  }): Promise<BacktestResult> {
    let balance = initialBalance;
    let positions: Position[] = [];
    let returns: number[] = [];
    let maxDrawdown = 0;
    let peak = initialBalance;
    let trades: { type: 'long' | 'short'; entry: number; exit: number; profit: number; timestamp: number }[] = [];

    // Calculer les indicateurs pour la stratégie
    const indicators = await this.calculateIndicators(strategy, data);

    // Simuler le trading sur chaque point de données
    for (let i = 0; i < data.length; i++) {
      const candle = data[i];
      const signal = this.getStrategySignal(strategy, indicators, i);

      if (signal === 'buy' && positions.length === 0) {
        // Ouvrir une position longue
        const quantity = balance / candle.close;
        positions.push({
          symbol,
          side: 'LONG',
          entryPrice: candle.close,
          quantity,
          unrealizedPnL: 0,
          timestamp: candle.timestamp
        });
      } else if (signal === 'sell' && positions.length > 0) {
        // Fermer la position
        const position = positions[0];
        const profit = (candle.close - position.entryPrice) * position.quantity;
        balance += profit;
        trades.push({
          type: 'long',
          entry: position.entryPrice,
          exit: candle.close,
          profit,
          timestamp: candle.timestamp
        });
        positions = [];
      }

      // Calculer les métriques
      const currentValue = balance + positions.reduce((sum, pos) => {
        const unrealizedPnL = (candle.close - pos.entryPrice) * pos.quantity;
        return sum + unrealizedPnL;
      }, 0);

      returns.push((currentValue - initialBalance) / initialBalance);

      if (currentValue > peak) {
        peak = currentValue;
      }

      const drawdown = (peak - currentValue) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculer les métriques finales
    const totalReturn = (balance - initialBalance) / initialBalance;

    return {
      initialBalance,
      finalBalance: balance,
      totalReturn,
      maxDrawdown,
      sharpeRatio: this.calculateSharpeRatio(returns),
      trades,
      indicators
    };
  }

  private async calculateIndicators(strategy: string, data: OHLCV[]): Promise<Record<string, number[]>> {
    // Implémenter le calcul des indicateurs selon la stratégie
    switch (strategy) {
      case 'sma-crossover':
        return {
          fastSMA: this.calculateSMA(data.map(d => d.close), 9),
          slowSMA: this.calculateSMA(data.map(d => d.close), 21)
        };
      default:
        return {};
    }
  }

  private calculateSMA(prices: number[], period: number): number[] {
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

  private getStrategySignal(
    strategy: string,
    indicators: Record<string, number[]>,
    index: number
  ): 'buy' | 'sell' | null {
    switch (strategy) {
      case 'sma-crossover':
        const { fastSMA, slowSMA } = indicators;
        if (index < 1) return null;

        const previousFast = fastSMA[index - 1];
        const previousSlow = slowSMA[index - 1];
        const currentFast = fastSMA[index];
        const currentSlow = slowSMA[index];

        if (previousFast <= previousSlow && currentFast > currentSlow) {
          return 'buy';
        } else if (previousFast >= previousSlow && currentFast < currentSlow) {
          return 'sell';
        }
        return null;

      default:
        return null;
    }
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);

    // Assuming risk-free rate of 0% for simplicity
    return mean / stdDev * Math.sqrt(252); // Annualized Sharpe Ratio
  }
}

export const binanceService = new BinanceService();