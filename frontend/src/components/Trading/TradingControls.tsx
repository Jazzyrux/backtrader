import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { binanceService } from '@/services/binance';
import type { OrderParams, MarketInfo } from '@/types/trading';
import { formatPrice } from '@/utils/format';

interface TradingControlsProps {
  symbol: string;
  onOrderSubmit?: (order: OrderParams) => void;
}

export const TradingControls: React.FC<TradingControlsProps> = ({ 
  symbol,
  onOrderSubmit 
}) => {
  const [amount, setAmount] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState('');
  const [marketInfo, setMarketInfo] = useState<MarketInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // S'abonner aux mises à jour du prix
  React.useEffect(() => {
    const unsubscribe = binanceService.subscribeToTicker(symbol, (info) => {
      setMarketInfo(info);
    });

    return () => unsubscribe();
  }, [symbol]);

  const validateOrder = (side: 'BUY' | 'SELL'): boolean => {
    setError(null);
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Veuillez entrer une quantité valide');
      return false;
    }

    if (orderType === 'LIMIT') {
      if (!limitPrice || isNaN(Number(limitPrice)) || Number(limitPrice) <= 0) {
        setError('Veuillez entrer un prix limite valide');
        return false;
      }
    }

    if (stopLoss && (isNaN(Number(stopLoss)) || Number(stopLoss) <= 0)) {
      setError('Stop loss invalide');
      return false;
    }

    if (takeProfit && (isNaN(Number(takeProfit)) || Number(takeProfit) <= 0)) {
      setError('Take profit invalide');
      return false;
    }

    return true;
  };

  const handleSubmit = useCallback((side: 'BUY' | 'SELL') => {
    if (!validateOrder(side)) return;

    const order: OrderParams = {
      symbol,
      type: orderType,
      side,
      quantity: Number(amount),
      price: orderType === 'LIMIT' ? Number(limitPrice) : undefined,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined
    };

    onOrderSubmit?.(order);

    // Réinitialiser les champs après la soumission
    setAmount('');
    setLimitPrice('');
    setStopLoss('');
    setTakeProfit('');
  }, [symbol, amount, orderType, limitPrice, stopLoss, takeProfit, onOrderSubmit]);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Contrôles de Trading</h3>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={orderType === 'MARKET' ? 'default' : 'outline'}
            onClick={() => setOrderType('MARKET')}
            className="flex-1"
          >
            Market
          </Button>
          <Button
            variant={orderType === 'LIMIT' ? 'default' : 'outline'}
            onClick={() => setOrderType('LIMIT')}
            className="flex-1"
          >
            Limit
          </Button>
        </div>

        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Quantité"
          className="w-full"
        />

        {orderType === 'LIMIT' && (
          <Input
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder="Prix limite"
            className="w-full"
          />
        )}

        <Input
          type="number"
          value={stopLoss}
          onChange={(e) => setStopLoss(e.target.value)}
          placeholder="Stop Loss"
          className="w-full"
        />

        <Input
          type="number"
          value={takeProfit}
          onChange={(e) => setTakeProfit(e.target.value)}
          placeholder="Take Profit"
          className="w-full"
        />

        {error && (
          <div className="text-red-500 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => handleSubmit('BUY')}
            className="w-full bg-green-500 hover:bg-green-600"
          >
            Acheter
          </Button>
          <Button
            onClick={() => handleSubmit('SELL')}
            className="w-full bg-red-500 hover:bg-red-600"
          >
            Vendre
          </Button>
        </div>
      </div>

      {marketInfo && (
        <div className="mt-4 text-sm text-gray-400">
          Prix actuel: {formatPrice(marketInfo.price)}
        </div>
      )}
    </Card>
  );
}; 