import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import type { Strategy } from '@/types/trading';

interface StrategyImporterProps {
  onStrategyImport: (strategy: Strategy) => void;
}

export const StrategyImporter: React.FC<StrategyImporterProps> = ({
  onStrategyImport
}) => {
  const [pinescriptCode, setPinescriptCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tvUrl, setTvUrl] = useState('');

  const handlePinescriptImport = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Ici, nous devrions avoir un service backend pour parser le code Pinescript
      // et le convertir en stratégie compatible avec notre système
      const response = await fetch('/api/strategies/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: pinescriptCode }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'importation de la stratégie');
      }

      const strategy = await response.json();
      onStrategyImport(strategy);
      setPinescriptCode('');
    } catch (error) {
      setError('Impossible d\'importer la stratégie. Vérifiez le code Pinescript.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTradingViewImport = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Extraire l'ID de la stratégie depuis l'URL TradingView
      const strategyId = tvUrl.split('/').pop();
      if (!strategyId) {
        throw new Error('URL TradingView invalide');
      }

      const response = await fetch(`/api/strategies/import/tradingview/${strategyId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'importation de la stratégie');
      }

      const strategy = await response.json();
      onStrategyImport(strategy);
      setTvUrl('');
    } catch (error) {
      setError('Impossible d\'importer la stratégie depuis TradingView.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Importer une Stratégie</h3>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Depuis TradingView
          </label>
          <div className="flex gap-2">
            <Input
              value={tvUrl}
              onChange={(e) => setTvUrl(e.target.value)}
              placeholder="URL de la stratégie TradingView"
              className="flex-1"
            />
            <Button
              onClick={handleTradingViewImport}
              disabled={isLoading || !tvUrl}
            >
              Importer
            </Button>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Collez l'URL d'une stratégie publique depuis TradingView.com
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900 text-gray-400">Ou</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Code Pinescript
          </label>
          <textarea
            value={pinescriptCode}
            onChange={(e) => setPinescriptCode(e.target.value)}
            placeholder="Collez votre code Pinescript ici..."
            className="w-full h-48 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            onClick={handlePinescriptImport}
            disabled={isLoading || !pinescriptCode}
            className="mt-2"
          >
            Importer le code
          </Button>
        </div>

        <div className="mt-4 text-sm text-gray-400">
          <h4 className="font-medium text-white mb-2">Stratégies populaires :</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <a
                href="https://www.tradingview.com/script/lmL2sNeb-machine-learning-lorentzian-classification/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Lorentzian Classification
              </a>
            </li>
            <li>
              <a
                href="https://www.tradingview.com/script/YJw8rFXc-Neural-Network-for-Trading/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Neural Network Trading
              </a>
            </li>
            <li>
              <a
                href="https://www.tradingview.com/script/3BjYMdGh-Random-Forest-Trading-Strategy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Random Forest Strategy
              </a>
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
};