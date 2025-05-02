import { useState, useEffect, useCallback } from 'react';
import type { OHLCV, Strategy, Position } from '@/types/trading';
import type { TimeFrame } from '@/services/binance';
import { binanceService } from '@/services/binance';

interface UseStrategyExecutionProps {
  symbol: string;
  strategy: Strategy;
  timeframe: TimeFrame;
  initialBalance: number;
  onTradeComplete?: (position: Position) => void;
}

export const useStrategyExecution = ({
  symbol,
  strategy,
  timeframe,
  initialBalance,
  onTradeComplete
}: UseStrategyExecutionProps) => {
  const [data, setData] = useState<OHLCV[]>([]);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [balance, setBalance] = useState(initialBalance);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les données historiques
  const loadHistoricalData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const historicalData = await binanceService.getKlines(symbol, timeframe);
      setData(historicalData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe]);

  // Exécuter la stratégie sur les nouvelles données
  const executeStrategy = useCallback((newData: OHLCV[]) => {
    if (newData.length < 2) return;

    const result = strategy.execute(newData, currentPosition);

    if (result.signal === 'buy' && !currentPosition) {
      const price = result.price || newData[newData.length - 1].close;
      const quantity = (balance * 0.95) / price;

      const newPosition: Position = {
        symbol,
        side: 'LONG',
        entryPrice: price,
        quantity,
        unrealizedPnL: 0,
        timestamp: result.timestamp || newData[newData.length - 1].timestamp,
        stopLoss: result.stopLoss,
        takeProfit: result.takeProfit
      };

      setCurrentPosition(newPosition);
      setPositions(prev => [...prev, newPosition]);
      setBalance(prev => prev - (price * quantity));

    } else if (result.signal === 'sell' && currentPosition) {
      const exitPrice = result.price || newData[newData.length - 1].close;
      const pnl = ((exitPrice - currentPosition.entryPrice) / currentPosition.entryPrice) * 100;

      const closedPosition: Position = {
        ...currentPosition,
        unrealizedPnL: pnl,
        exitPrice,
        exitTimestamp: result.timestamp || newData[newData.length - 1].timestamp,
        exitReason: result.reason || 'signal'
      };

      setPositions(prev => prev.map(p => 
        p.timestamp === currentPosition.timestamp ? closedPosition : p
      ));
      setCurrentPosition(null);
      setBalance(prev => prev + (exitPrice * currentPosition.quantity));
      onTradeComplete?.(closedPosition);
    }
  }, [strategy, currentPosition, balance, symbol, onTradeComplete]);

  // Mettre à jour les positions existantes
  const updatePositions = useCallback(() => {
    if (!currentPosition || data.length === 0) return;

    const lastPrice = data[data.length - 1].close;
    const pnl = ((lastPrice - currentPosition.entryPrice) / currentPosition.entryPrice) * 100;

    // Vérifier stop loss et take profit
    if (currentPosition.stopLoss && lastPrice <= currentPosition.stopLoss) {
      const stopLossPrice = currentPosition.stopLoss;
      const closedPosition: Position = {
        ...currentPosition,
        exitPrice: stopLossPrice,
        exitTimestamp: data[data.length - 1].timestamp,
        exitReason: 'stop_loss',
        unrealizedPnL: ((stopLossPrice - currentPosition.entryPrice) / currentPosition.entryPrice) * 100
      };
      setPositions(prev => prev.map(p => 
        p.timestamp === currentPosition.timestamp ? closedPosition : p
      ));
      setCurrentPosition(null);
      setBalance(prev => prev + (stopLossPrice * currentPosition.quantity));
      onTradeComplete?.(closedPosition);
      return;
    }

    if (currentPosition.takeProfit && lastPrice >= currentPosition.takeProfit) {
      const takeProfitPrice = currentPosition.takeProfit;
      const closedPosition: Position = {
        ...currentPosition,
        exitPrice: takeProfitPrice,
        exitTimestamp: data[data.length - 1].timestamp,
        exitReason: 'take_profit',
        unrealizedPnL: ((takeProfitPrice - currentPosition.entryPrice) / currentPosition.entryPrice) * 100
      };
      setPositions(prev => prev.map(p => 
        p.timestamp === currentPosition.timestamp ? closedPosition : p
      ));
      setCurrentPosition(null);
      setBalance(prev => prev + (takeProfitPrice * currentPosition.quantity));
      onTradeComplete?.(closedPosition);
      return;
    }

    // Mettre à jour le PnL non réalisé
    setCurrentPosition(prev => prev ? {
      ...prev,
      unrealizedPnL: pnl
    } : null);
  }, [currentPosition, data, onTradeComplete]);

  // Mettre à jour les données et exécuter la stratégie
  useEffect(() => {
    loadHistoricalData();
  }, [loadHistoricalData]);

  useEffect(() => {
    if (data.length > 0) {
      executeStrategy(data);
      updatePositions();
    }
  }, [data, executeStrategy, updatePositions]);

  // S'abonner aux mises à jour en temps réel
  useEffect(() => {
    const unsubscribe = binanceService.subscribeToKlines(symbol, timeframe, (kline) => {
      setData(prev => {
        const lastIndex = prev.length - 1;
        if (lastIndex >= 0 && prev[lastIndex].timestamp === kline.timestamp) {
          return [...prev.slice(0, -1), kline];
        }
        return [...prev, kline];
      });
    });

    return () => unsubscribe();
  }, [symbol, timeframe]);

  return {
    data,
    currentPosition,
    positions,
    balance,
    isLoading,
    error
  };
}; 