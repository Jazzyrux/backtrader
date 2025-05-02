import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Strategy } from '@/types/trading';

interface AIStrategyPanelProps {
  onStrategyCreate: (strategy: Strategy) => void;
}

export const AIStrategyPanel: React.FC<AIStrategyPanelProps> = ({ onStrategyCreate }) => {
  const [modelType, setModelType] = useState<'lstm' | 'transformer'>('lstm');
  const [lookback, setLookback] = useState(60);
  const [features, setFeatures] = useState(['price', 'volume', 'rsi']);

  const handleCreateStrategy = () => {
    const strategy: Strategy = {
      id: `ai-${modelType}-${Date.now()}`,
      name: `AI ${modelType.toUpperCase()} Strategy`,
      description: `Stratégie basée sur un modèle ${modelType.toUpperCase()} avec ${lookback} périodes de lookback`,
      type: 'trend',
      indicators: [
        {
          name: 'AI Prediction',
          type: 'CUSTOM',
          params: {
            period: lookback,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            stdDev: 2
          }
        }
      ],
      execute: () => ({ signal: 'hold' }),
      calculate: () => ({ predictions: [] })
    };

    onStrategyCreate(strategy);
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Configuration du Modèle AI</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Type de Modèle</label>
          <select
            className="w-full p-2 bg-gray-700 rounded"
            value={modelType}
            onChange={(e) => setModelType(e.target.value as 'lstm' | 'transformer')}
          >
            <option value="lstm">LSTM</option>
            <option value="transformer">Transformer</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Lookback (périodes)</label>
          <Input
            type="number"
            value={lookback}
            onChange={(e) => setLookback(Number(e.target.value))}
            min={1}
            max={500}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Features</label>
          <div className="space-y-2">
            {['price', 'volume', 'rsi', 'macd', 'bollinger'].map(feature => (
              <label key={feature} className="flex items-center">
                <input
                  type="checkbox"
                  checked={features.includes(feature)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFeatures([...features, feature]);
                    } else {
                      setFeatures(features.filter(f => f !== feature));
                    }
                  }}
                  className="mr-2"
                />
                {feature.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        <Button
          onClick={handleCreateStrategy}
          className="w-full"
          disabled={features.length === 0}
        >
          Créer la Stratégie
        </Button>
      </div>
    </Card>
  );
}; 