import { useState } from 'react';
import type { Strategy } from '@/types/trading';
import { BacktestPanel } from '@/components/Trading/BacktestPanel';
import { AIStrategyPanel } from '@/components/AI/AIStrategyPanel';

interface StrategyPanelProps {
  symbol?: string;
}

export const StrategyPanel = ({ symbol }: StrategyPanelProps) => {
  const [activeTab, setActiveTab] = useState<'backtest' | 'ai'>('backtest');

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex space-x-2 mb-4">
        <button
          className={`px-4 py-2 rounded ${
            activeTab === 'backtest' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => setActiveTab('backtest')}
        >
          Backtest
        </button>
        <button
          className={`px-4 py-2 rounded ${
            activeTab === 'ai' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => setActiveTab('ai')}
        >
          AI Strategy
        </button>
      </div>

      {activeTab === 'backtest' && symbol && (
        <BacktestPanel symbol={symbol} />
      )}

      {activeTab === 'ai' && (
        <AIStrategyPanel />
      )}
    </div>
  );
}; 