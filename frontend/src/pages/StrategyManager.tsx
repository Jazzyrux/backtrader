import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StrategyImportDialog } from '@/components/Strategy/StrategyImportDialog';
import { getStrategies } from '@/strategies';
import { strategyService } from '@/services/strategyService';
import type { Strategy, IndicatorParams } from '@/types/trading';

export const StrategyManager: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>(getStrategies());
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      const loadedStrategies = await strategyService.getStrategies();
      setStrategies(loadedStrategies);
    } catch (error) {
      console.error('Erreur lors du chargement des stratégies:', error);
    }
  };

  const defaultIndicatorParams: IndicatorParams = {
    period: 14,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    stdDev: 2
  };

  const defaultStrategy: Strategy = {
    id: '',
    name: '',
    description: '',
    type: 'trend',
    indicators: [],
    execute: () => ({ signal: 'hold' }),
    calculate: () => ({})
  };

  const handleStrategyImport = async (newStrategy: Strategy) => {
    try {
      const importedStrategy = await strategyService.createStrategy({
        name: newStrategy.name,
        content: JSON.stringify(newStrategy),
        type: 'typescript'
      });
      setStrategies(prev => [...prev, importedStrategy]);
    } catch (error) {
      console.error('Erreur lors de l\'importation:', error);
    }
  };

  const handleStrategyDelete = async (id: string) => {
    try {
      await strategyService.deleteStrategy(id);
      setStrategies(prev => prev.filter(s => s.id !== id));
      if (selectedStrategy?.id === id) {
        setSelectedStrategy(null);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const handleSave = async (strategy: Strategy) => {
    try {
      if (isCreating) {
        const newStrategy = await strategyService.createStrategy({
          name: strategy.name,
          content: JSON.stringify(strategy),
          type: 'typescript'
        });
        setStrategies(prev => [...prev, newStrategy]);
      } else {
        const updatedStrategy = await strategyService.updateStrategy(strategy.id, {
          name: strategy.name,
          content: JSON.stringify(strategy),
          type: 'typescript'
        });
        setStrategies(prev => prev.map(s => s.id === strategy.id ? updatedStrategy : s));
      }
      setIsEditing(false);
      setIsCreating(false);
      setSelectedStrategy(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const filteredStrategies = strategies.filter(strategy => 
    strategy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    strategy.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    strategy.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const StrategyForm = ({ strategy, onSave }: { strategy: Strategy; onSave: (strategy: Strategy) => void }) => {
    const [formData, setFormData] = useState(strategy);
    const [newIndicator, setNewIndicator] = useState<{
      type: 'SMA' | 'RSI' | 'MACD' | 'BB';
      name: string;
      params: IndicatorParams;
    }>({
      type: 'SMA',
      name: '',
      params: defaultIndicatorParams
    });

    const handleAddIndicator = () => {
      if (!newIndicator.name) return;
      setFormData({
        ...formData,
        indicators: [...formData.indicators, newIndicator]
      });
      setNewIndicator({
        type: 'SMA',
        name: '',
        params: defaultIndicatorParams
      });
    };

    return (
      <Card className="p-4 space-y-4">
        <h3 className="text-lg font-semibold">
          {isCreating ? 'Nouvelle Stratégie' : 'Modifier la Stratégie'}
        </h3>
        
        <div className="space-y-4">
          <Input
            placeholder="ID"
            value={formData.id}
            onChange={e => setFormData({ ...formData, id: e.target.value })}
            disabled={!isCreating}
          />
          
          <Input
            placeholder="Nom"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
          
          <Input
            placeholder="Description"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
          
          <select
            className="w-full p-2 bg-gray-700 rounded"
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value as Strategy['type'] })}
          >
            <option value="trend">Trend</option>
            <option value="momentum">Momentum</option>
            <option value="breakout">Breakout</option>
            <option value="mean-reversion">Mean Reversion</option>
            <option value="machine-learning">Machine Learning</option>
          </select>

          <div className="space-y-2">
            <h4 className="font-medium">Indicateurs</h4>
            {formData.indicators.map((indicator, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-700 p-2 rounded">
                <span>{indicator.name}</span>
                <span className="text-gray-400">({indicator.type})</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFormData({
                    ...formData,
                    indicators: formData.indicators.filter((_, i) => i !== index)
                  })}
                >
                  Supprimer
                </Button>
              </div>
            ))}

            <div className="flex gap-2">
              <select
                className="flex-1 p-2 bg-gray-700 rounded"
                value={newIndicator.type}
                onChange={e => setNewIndicator({
                  ...newIndicator,
                  type: e.target.value as typeof newIndicator.type
                })}
              >
                <option value="SMA">SMA</option>
                <option value="RSI">RSI</option>
                <option value="MACD">MACD</option>
                <option value="BB">Bollinger Bands</option>
              </select>
              
              <Input
                className="flex-1"
                placeholder="Nom de l'indicateur"
                value={newIndicator.name}
                onChange={e => setNewIndicator({ ...newIndicator, name: e.target.value })}
              />
              
              <Button onClick={handleAddIndicator}>
                Ajouter
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setIsCreating(false);
                setSelectedStrategy(null);
              }}
            >
              Annuler
            </Button>
            <Button onClick={() => onSave(formData)}>
              Sauvegarder
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestionnaire de Stratégies</h1>
          <p className="text-gray-400">
            Gérez vos stratégies de trading et importez-en de nouvelles depuis TradingView
          </p>
        </div>
        <div className="space-x-2">
          <Button onClick={() => {
            setSelectedStrategy(defaultStrategy);
            setIsCreating(true);
            setIsEditing(true);
          }}>
            Nouvelle Stratégie
          </Button>
          <Button onClick={() => setIsImportDialogOpen(true)}>
            Importer
          </Button>
        </div>
      </header>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Rechercher une stratégie..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {(isEditing || isCreating) ? (
        <StrategyForm
          strategy={selectedStrategy || defaultStrategy}
          onSave={handleSave}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStrategies.map((strategy) => (
                <Card
                  key={strategy.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedStrategy?.id === strategy.id
                      ? 'border-blue-500'
                      : 'hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedStrategy(strategy)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold">{strategy.name}</h3>
                    <span className="px-2 py-1 text-xs rounded bg-gray-700">
                      {strategy.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    {strategy.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {strategy.indicators.map((indicator) => (
                      <span
                        key={indicator.name}
                        className="px-2 py-1 text-xs rounded bg-gray-800"
                      >
                        {indicator.name}
                      </span>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {selectedStrategy && !isEditing && (
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">
                  Configuration de la Stratégie
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Intervalle Minimum
                    </label>
                    <div className="text-sm text-gray-400">
                      {(selectedStrategy.minDecisionInterval || 60000) / 1000} secondes
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Indicateurs
                    </label>
                    <div className="space-y-2">
                      {selectedStrategy.indicators.map((indicator) => (
                        <div
                          key={indicator.name}
                          className="flex justify-between items-center p-2 bg-gray-800 rounded"
                        >
                          <span>{indicator.name}</span>
                          <span className="text-sm text-gray-400">
                            {Object.entries(indicator.params)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-500 hover:text-red-400"
                      onClick={() => handleStrategyDelete(selectedStrategy.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      <StrategyImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImport={handleStrategyImport}
      />
    </div>
  );
}; 