import React, { useState } from 'react';
import type { Strategy } from '@/types/trading';
import { Card } from '@/components/ui/Card';

interface StrategySelectorProps {
  selectedStrategy: Strategy | null;
  onStrategyChange: (strategy: Strategy) => void;
  strategies: Strategy[];
}

export const StrategySelector: React.FC<StrategySelectorProps> = ({
  selectedStrategy,
  onStrategyChange,
  strategies
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Card 
        className={`p-4 cursor-pointer hover:bg-gray-700 transition-colors ${
          isOpen ? 'bg-gray-700' : ''
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex justify-between items-center">
          <span className="font-medium">
            {selectedStrategy?.name || 'Sélectionner une stratégie'}
          </span>
          <svg 
            className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {selectedStrategy?.description && (
          <p className="text-sm text-gray-400 mt-1">
            {selectedStrategy.description}
          </p>
        )}
      </Card>

      {isOpen && (
        <div className="absolute w-full mt-2 z-10">
          <Card className="divide-y divide-gray-700">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className={`p-4 cursor-pointer hover:bg-gray-700 transition-colors ${
                  strategy.id === selectedStrategy?.id ? 'bg-gray-700' : ''
                }`}
                onClick={() => {
                  onStrategyChange(strategy);
                  setIsOpen(false);
                }}
              >
                <div className="font-medium">{strategy.name}</div>
                {strategy.description && (
                  <p className="text-sm text-gray-400 mt-1">
                    {strategy.description}
                  </p>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}; 