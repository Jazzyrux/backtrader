import React from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type { Strategy } from '@/types/trading';

interface StrategyParametersProps {
  strategy: Strategy;
  onParametersChange: (params: Record<string, number>) => void;
}

export const StrategyParameters: React.FC<StrategyParametersProps> = ({
  strategy,
  onParametersChange
}) => {
  const [params, setParams] = React.useState<Record<string, number>>(() => {
    const initialParams: Record<string, number> = {};
    strategy.indicators.forEach(indicator => {
      Object.entries(indicator.params).forEach(([key, value]) => {
        initialParams[`${indicator.name}_${key}`] = value;
      });
    });
    return initialParams;
  });

  const handleParamChange = (name: string, value: number) => {
    const newParams = { ...params, [name]: value };
    setParams(newParams);
    onParametersChange(newParams);
  };

  const renderGaussianStochasticParams = () => (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">Moyenne Gaussienne</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Période</label>
            <Input
              type="number"
              value={params.GMA_period}
              onChange={(e) => handleParamChange('GMA_period', Number(e.target.value))}
              min={1}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">Écart-type</label>
            <Input
              type="number"
              value={params.GMA_stdDev}
              onChange={(e) => handleParamChange('GMA_stdDev', Number(e.target.value))}
              min={0.1}
              step={0.1}
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">RSI</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Période</label>
            <Input
              type="number"
              value={params.RSI_period}
              onChange={(e) => handleParamChange('RSI_period', Number(e.target.value))}
              min={1}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">Seuils</label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={params.RSI_oversold}
                onChange={(e) => handleParamChange('RSI_oversold', Number(e.target.value))}
                min={0}
                max={100}
                placeholder="Survente"
              />
              <Input
                type="number"
                value={params.RSI_overbought}
                onChange={(e) => handleParamChange('RSI_overbought', Number(e.target.value))}
                min={0}
                max={100}
                placeholder="Surachat"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Stochastique</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Période K</label>
            <Input
              type="number"
              value={params.Stoch_period}
              onChange={(e) => handleParamChange('Stoch_period', Number(e.target.value))}
              min={1}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">Période D</label>
            <Input
              type="number"
              value={params.Stoch_smoothD}
              onChange={(e) => handleParamChange('Stoch_smoothD', Number(e.target.value))}
              min={1}
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Gestion du Risque</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Stop Loss (%)</label>
            <Input
              type="number"
              value={params.stopLossPercent}
              onChange={(e) => handleParamChange('stopLossPercent', Number(e.target.value))}
              min={0.1}
              step={0.1}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">Take Profit (%)</label>
            <Input
              type="number"
              value={params.takeProfitPercent}
              onChange={(e) => handleParamChange('takeProfitPercent', Number(e.target.value))}
              min={0.1}
              step={0.1}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSMACrossoverParams = () => (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">Moyennes Mobiles</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Période Rapide</label>
            <Input
              type="number"
              value={params.SMA_Fast_period}
              onChange={(e) => handleParamChange('SMA_Fast_period', Number(e.target.value))}
              min={1}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">Période Lente</label>
            <Input
              type="number"
              value={params.SMA_Slow_period}
              onChange={(e) => handleParamChange('SMA_Slow_period', Number(e.target.value))}
              min={1}
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Gestion du Risque</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Stop Loss (%)</label>
            <Input
              type="number"
              value={params.stopLossPercent}
              onChange={(e) => handleParamChange('stopLossPercent', Number(e.target.value))}
              min={0.1}
              step={0.1}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">Take Profit (%)</label>
            <Input
              type="number"
              value={params.takeProfitPercent}
              onChange={(e) => handleParamChange('takeProfitPercent', Number(e.target.value))}
              min={0.1}
              step={0.1}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Paramètres de la Stratégie</h3>
      {strategy.id === 'gaussian-stochastic' && renderGaussianStochasticParams()}
      {strategy.id === 'sma-crossover' && renderSMACrossoverParams()}
      {/* Ajouter d'autres stratégies ici */}
    </Card>
  );
}; 