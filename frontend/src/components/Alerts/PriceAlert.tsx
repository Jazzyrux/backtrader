import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface PriceAlertProps {
  currentPrice: number;
  symbol: string;
  onAlertSet: (price: number, type: 'above' | 'below') => void;
}

export const PriceAlert: React.FC<PriceAlertProps> = ({ currentPrice, symbol, onAlertSet }) => {
  const [alertPrice, setAlertPrice] = useState<number>(currentPrice);
  const [alertType, setAlertType] = useState<'above' | 'below'>('above');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAlertSet(alertPrice, alertType);
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold">Alerte de Prix pour {symbol}</h3>
        
        <div>
          <label className="block text-sm font-medium mb-2">Type d'Alerte</label>
          <select
            className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
            value={alertType}
            onChange={(e) => setAlertType(e.target.value as 'above' | 'below')}
          >
            <option value="above">Prix Au-dessus</option>
            <option value="below">Prix En-dessous</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Prix</label>
          <Input
            type="number"
            value={alertPrice}
            onChange={(e) => setAlertPrice(Number(e.target.value))}
            step="0.01"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
        >
          Définir l'Alerte
        </Button>
      </form>
    </Card>
  );
}; 