import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { OrderParams } from '@/types/trading';

interface OrderFormProps {
  symbol: string;
  onSubmit?: (order: OrderParams) => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  symbol,
  onSubmit
}) => {
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  const handleSubmit = (side: 'BUY' | 'SELL') => {
    if (!quantity || !onSubmit) return;

    const order: OrderParams = {
      symbol,
      side,
      quantity: parseFloat(quantity),
      price: price ? parseFloat(price) : undefined,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      type: price ? 'LIMIT' : 'MARKET'
    };

    onSubmit(order);
    resetForm();
  };

  const resetForm = () => {
    setQuantity('');
    setPrice('');
    setStopLoss('');
    setTakeProfit('');
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Nouvel Ordre</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Quantité</label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantité"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Prix (optionnel)</label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Prix limite"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Stop Loss (optionnel)</label>
          <Input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder="Stop Loss"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Take Profit (optionnel)</label>
          <Input
            type="number"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            placeholder="Take Profit"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => handleSubmit('BUY')}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Acheter
          </Button>
          <Button
            onClick={() => handleSubmit('SELL')}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            Vendre
          </Button>
        </div>
      </div>
    </Card>
  );
}; 