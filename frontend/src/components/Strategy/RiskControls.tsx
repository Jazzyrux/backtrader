import React from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Slicer } from '@/components/ui/Slicer';
import type { Strategy } from '@/types/trading';

interface RiskControlsProps {
  strategy: Strategy;
  onRiskParamsChange: (params: RiskParams) => void;
  initialBalance: number;
}

export interface RiskParams {
  leverage: number;
  riskPerTrade: number;
  positionSize: number;
  stopLossPercent: number;
  takeProfitPercent: number;
}

export const RiskControls: React.FC<RiskControlsProps> = ({
  strategy,
  onRiskParamsChange,
  initialBalance
}) => {
  const [params, setParams] = React.useState<RiskParams>(() => {
    // Paramètres par défaut selon la stratégie
    const defaults: Record<string, RiskParams> = {
      'gaussian-stochastic': {
        leverage: 1,
        riskPerTrade: 1,
        positionSize: 10,
        stopLossPercent: 2,
        takeProfitPercent: 4
      },
      'sma-crossover': {
        leverage: 2,
        riskPerTrade: 1.5,
        positionSize: 15,
        stopLossPercent: 3,
        takeProfitPercent: 6
      },
      'mean-reversion': {
        leverage: 1,
        riskPerTrade: 1,
        positionSize: 10,
        stopLossPercent: 1.5,
        takeProfitPercent: 3
      }
    };

    return defaults[strategy.id] || {
      leverage: 1,
      riskPerTrade: 1,
      positionSize: 10,
      stopLossPercent: 2,
      takeProfitPercent: 4
    };
  });

  const handleParamChange = (name: keyof RiskParams, value: number) => {
    const newParams = { ...params, [name]: value };

    // Ajuster les paramètres en fonction de la stratégie
    if (strategy.id === 'gaussian-stochastic') {
      // Limiter le levier pour la stratégie gaussienne
      newParams.leverage = Math.min(newParams.leverage, 3);
      // Ajuster le take profit en fonction du stop loss
      newParams.takeProfitPercent = newParams.stopLossPercent * 2;
    } else if (strategy.id === 'sma-crossover') {
      // Permettre un levier plus élevé pour le trend following
      newParams.leverage = Math.min(newParams.leverage, 5);
      // Ratio risque/récompense plus agressif
      newParams.takeProfitPercent = newParams.stopLossPercent * 3;
    }

    // Calculer la taille de position en fonction du risque
    const riskAmount = initialBalance * (newParams.riskPerTrade / 100);
    newParams.positionSize = (riskAmount / newParams.stopLossPercent) * newParams.leverage;

    setParams(newParams);
    onRiskParamsChange(newParams);
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Gestion du Risque</h3>
      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Levier (x)</label>
          <Slicer
            label="Levier"
            value={params.leverage}
            onChange={(value) => handleParamChange('leverage', value)}
            min={1}
            max={strategy.id === 'sma-crossover' ? 5 : 3}
            step={1}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Risque par Trade (%)</label>
          <Slicer
            label="Risque par Trade"
            value={params.riskPerTrade}
            onChange={(value) => handleParamChange('riskPerTrade', value)}
            min={0.1}
            max={5}
            step={0.1}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Stop Loss (%)</label>
          <Input
            type="number"
            value={params.stopLossPercent}
            onChange={(e) => handleParamChange('stopLossPercent', Number(e.target.value))}
            min={0.1}
            step={0.1}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Take Profit (%)</label>
          <Input
            type="number"
            value={params.takeProfitPercent}
            onChange={(e) => handleParamChange('takeProfitPercent', Number(e.target.value))}
            min={0.1}
            step={0.1}
          />
        </div>

        <div className="bg-gray-700 p-3 rounded">
          <div className="text-sm text-gray-400">Taille de Position</div>
          <div className="text-lg font-semibold">
            {params.positionSize.toFixed(2)}% du capital
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {(initialBalance * (params.positionSize / 100)).toFixed(2)} USDT
          </div>
        </div>
      </div>
    </Card>
  );
}; 