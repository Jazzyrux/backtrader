import React, { useState } from 'react';
import type { Strategy } from '@/types/trading';

export const StrategyBuilder = () => {
  const [strategy, setStrategy] = useState<Strategy>({
    id: '',
    name: '',
    params: {},
    indicators: [] // Ajout du champ manquant indicators
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Logique de sauvegarde de la stratégie
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-400">Name</label>
        <input
          type="text"
          className="input"
          value={strategy.name}
          onChange={e => setStrategy(prev => ({ ...prev, name: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400">Parameters</label>
        {/* Ajouter des champs dynamiques pour les paramètres */}
      </div>

      <button type="submit" className="button">
        Save Strategy
      </button>
    </form>
  );
}; 