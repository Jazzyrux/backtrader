import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { DatePicker } from '@/components/ui/DatePicker';
import type { Strategy } from '@/types/trading';

interface SimulationConfigProps {
  onStartSimulation: (config: SimulationConfig) => void;
  strategies: Strategy[];
  isLoading?: boolean;
}

export interface SimulationConfig {
  startDate: Date;
  endDate: Date;
  initialBalance: number;
  isLiveTrading: boolean;
  selectedStrategy: string;
}

export const SimulationConfig: React.FC<SimulationConfigProps> = ({
  onStartSimulation,
  strategies,
  isLoading
}) => {
  const [config, setConfig] = useState<SimulationConfig>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours avant
    endDate: new Date(),
    initialBalance: 10000,
    isLiveTrading: false,
    selectedStrategy: strategies[0]?.id || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartSimulation(config);
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Configuration de la Simulation</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Période de Simulation</label>
          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              value={config.startDate}
              onChange={(date) => setConfig({ ...config, startDate: date })}
              placeholder="Date de début"
            />
            <DatePicker
              value={config.endDate}
              onChange={(date) => setConfig({ ...config, endDate: date })}
              placeholder="Date de fin"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Balance Initiale</label>
          <Input
            type="number"
            value={config.initialBalance}
            onChange={(e) => setConfig({ ...config, initialBalance: Number(e.target.value) })}
            min={0}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Stratégie</label>
          <select
            className="w-full p-2 rounded border border-gray-600 bg-gray-800"
            value={config.selectedStrategy}
            onChange={(e) => setConfig({ ...config, selectedStrategy: e.target.value })}
          >
            {strategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Trading en Direct</label>
          <Switch
            checked={config.isLiveTrading}
            onCheckedChange={(checked) => setConfig({ ...config, isLiveTrading: checked })}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Simulation en cours...' : 'Démarrer la Simulation'}
        </Button>
      </form>
    </Card>
  );
}; 