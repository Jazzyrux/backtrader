import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { Strategy } from '@/types/trading';

interface MetricsMenuProps {
  strategy: Strategy;
  onMetricsChange: (selectedMetrics: string[]) => void;
}

export const MetricsMenu: React.FC<MetricsMenuProps> = ({
  strategy,
  onMetricsChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

  const handleMetricToggle = (metricName: string) => {
    const newSelection = selectedMetrics.includes(metricName)
      ? selectedMetrics.filter(m => m !== metricName)
      : [...selectedMetrics, metricName];
    
    setSelectedMetrics(newSelection);
    onMetricsChange(newSelection);
  };

  // Obtenir toutes les métriques disponibles pour cette stratégie
  const availableMetrics = strategy.indicators.map(ind => ind.name);
  if (strategy.id === 'gaussian-stochastic') {
    availableMetrics.push('GMA', 'Bandes de Bollinger', 'RSI', 'Stochastique');
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
      >
        <svg
          className={`w-6 h-6 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {isExpanded && (
        <Card className="absolute right-0 mt-2 p-4 w-64 z-50">
          <h3 className="font-medium mb-3">Métriques</h3>
          <div className="space-y-2">
            {availableMetrics.map((metric) => (
              <label key={metric} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(metric)}
                  onChange={() => handleMetricToggle(metric)}
                  className="rounded border-gray-600 bg-gray-700"
                />
                <span>{metric}</span>
              </label>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}; 