import { useState, useCallback } from 'react';
import type { OrderParams, Position } from '@/types/trading';

interface UseOrdersOptions {
  initialBalance: number;
  onBalanceChange?: (newBalance: number) => void;
  onPositionChange?: (positions: Position[]) => void;
}

export const useOrders = ({ 
  initialBalance,
  onBalanceChange,
  onPositionChange
}: UseOrdersOptions) => {
  const [balance, setBalance] = useState(initialBalance);
  const [positions, setPositions] = useState<Position[]>([]);

  const submitOrder = useCallback((order: OrderParams) => {
    const executionPrice = order.price || 0;
    const cost = order.quantity * executionPrice;
    
    if (cost > balance) {
      throw new Error('Fonds insuffisants pour exécuter cet ordre');
    }

    const newPosition: Position = {
      symbol: order.symbol,
      side: order.side === 'BUY' ? 'LONG' : 'SHORT',
      entryPrice: executionPrice,
      quantity: order.quantity,
      unrealizedPnL: 0,
      timestamp: Date.now(),
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit
    };

    const newBalance = balance - cost;
    const newPositions = [...positions, newPosition];

    setBalance(newBalance);
    setPositions(newPositions);

    onBalanceChange?.(newBalance);
    onPositionChange?.(newPositions);

    return newPosition;
  }, [balance, positions, onBalanceChange, onPositionChange]);

  const closePosition = useCallback((positionIndex: number, closePrice: number, reason: 'signal' | 'stop_loss' | 'take_profit' = 'signal') => {
    const position = positions[positionIndex];
    if (!position) return;

    const pnl = position.side === 'LONG'
      ? (closePrice - position.entryPrice) * position.quantity
      : (position.entryPrice - closePrice) * position.quantity;

    const updatedPosition: Position = {
      ...position,
      exitPrice: closePrice,
      exitTimestamp: Date.now(),
      exitReason: reason,
      unrealizedPnL: (pnl / (position.entryPrice * position.quantity)) * 100
    };

    const newBalance = balance + (position.quantity * closePrice) + pnl;
    const newPositions = positions.filter((_, index) => index !== positionIndex);

    setBalance(newBalance);
    setPositions(newPositions);

    onBalanceChange?.(newBalance);
    onPositionChange?.(newPositions);

    return updatedPosition;
  }, [balance, positions, onBalanceChange, onPositionChange]);

  const updatePositions = useCallback((currentPrice: number) => {
    const updatedPositions = positions.map(position => {
      const pnl = position.side === 'LONG'
        ? (currentPrice - position.entryPrice) * position.quantity
        : (position.entryPrice - currentPrice) * position.quantity;

      // Vérifier les conditions de stop loss et take profit
      if (position.stopLoss && currentPrice <= position.stopLoss) {
        const closed = closePosition(positions.indexOf(position), position.stopLoss, 'stop_loss');
        return closed || position;
      }
      if (position.takeProfit && currentPrice >= position.takeProfit) {
        const closed = closePosition(positions.indexOf(position), position.takeProfit, 'take_profit');
        return closed || position;
      }

      return {
        ...position,
        unrealizedPnL: (pnl / (position.entryPrice * position.quantity)) * 100
      };
    });

    const validPositions = updatedPositions.filter((p): p is Position => p !== undefined && !p.exitPrice);
    setPositions(validPositions);
    onPositionChange?.(validPositions);
  }, [positions, closePosition, onPositionChange]);

  return {
    balance,
    positions,
    submitOrder,
    closePosition,
    updatePositions
  };
}; 