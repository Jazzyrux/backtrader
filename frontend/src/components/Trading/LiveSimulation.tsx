import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { tradingService } from '@/services/trading';
import { binanceService, type TimeFrame } from '@/services/binance';
import { formatPrice, formatPercent } from '@/utils/format';
import type { OHLCV, Position } from '@/types/trading';
import { TradingView } from '@/components/Trading/TradingView';
import { getStrategies } from '@/services/strategies';

interface LiveSimulationProps {
  symbol: string;
  timeframe: TimeFrame;
  onTimeframeChange: (timeframe: TimeFrame) => void;
  initialBalance?: number;
}

export const LiveSimulation: React.FC<LiveSimulationProps> = ({
  symbol,
  timeframe,
  onTimeframeChange,
  initialBalance = 10000
}) => {
  const strategies = getStrategies();
  const [selectedStrategy, setSelectedStrategy] = useState(strategies[0]?.id);
  const [data, setData] = useState<OHLCV[]>([]);
  const [displayData, setDisplayData] = useState<OHLCV[]>([]);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [balance, setBalance] = useState(initialBalance);
  const [isRunning, setIsRunning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const updateInterval = useRef<NodeJS.Timeout>();
  const accumulatedData = useRef<OHLCV[]>([]);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const loadDataWithRetry = async (retryAttempt = 0): Promise<void> => {
    try {
      setError(null);
      const historicalData = await binanceService.getKlines(symbol, timeframe);
      setData(historicalData);
      setDisplayData(historicalData);
      accumulatedData.current = historicalData;
      setLastUpdate(Date.now());
      retryCount.current = 0;
    } catch (error) {
      console.error('Error loading data:', error);
      if (retryAttempt < maxRetries) {
        const delay = Math.pow(2, retryAttempt) * 1000;
        console.log(`Retrying in ${delay/1000} seconds... (Attempt ${retryAttempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadDataWithRetry(retryAttempt + 1);
      }
      setError('Impossible de charger les données. Veuillez réessayer plus tard.');
      setIsRunning(false);
    }
  };

  useEffect(() => {
    loadDataWithRetry();
  }, [symbol, timeframe]);

  useEffect(() => {
    if (!isRunning) return;

    let unsubscribe: (() => void) | undefined;
    let retryTimeout: NodeJS.Timeout;

    const setupSubscription = async (retryAttempt = 0) => {
      try {
        setError(null);
        unsubscribe = binanceService.subscribeToKlines(symbol, '1m', (newData: OHLCV | OHLCV[]) => {
          if (Array.isArray(newData)) {
            accumulatedData.current = newData;
          } else {
            const lastIndex = accumulatedData.current.length - 1;
            if (lastIndex >= 0 && accumulatedData.current[lastIndex].timestamp === newData.timestamp) {
              accumulatedData.current = [...accumulatedData.current.slice(0, -1), newData];
            } else {
              accumulatedData.current = [...accumulatedData.current, newData];
            }
          }
          setData(accumulatedData.current);
        });
      } catch (error) {
        console.error('Error in subscription:', error);
        if (retryAttempt < maxRetries) {
          const delay = Math.pow(2, retryAttempt) * 1000;
          console.log(`Retrying subscription in ${delay/1000} seconds... (Attempt ${retryAttempt + 1}/${maxRetries})`);
          retryTimeout = setTimeout(() => setupSubscription(retryAttempt + 1), delay);
        } else {
          setError('Erreur de connexion aux données en temps réel');
          setIsRunning(false);
        }
      }
    };

    setupSubscription();

    updateInterval.current = setInterval(() => {
      if (accumulatedData.current.length > 0) {
        setDisplayData(accumulatedData.current);
        setLastUpdate(Date.now());
      }
    }, 2000);

    return () => {
      if (unsubscribe) unsubscribe();
      if (updateInterval.current) clearInterval(updateInterval.current);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [symbol, isRunning]);

  // Exécuter la stratégie
  useEffect(() => {
    if (!isRunning || !selectedStrategy || !data.length) return;

    const strategy = getStrategies().find(s => s.id === selectedStrategy);
    if (!strategy) return;

    const handlePositionUpdate = (position: Position | null) => {
      setCurrentPosition(position);
      if (position) {
        setBalance(prev => prev * (1 + (position.unrealizedPnL || 0) / 100));
      }
    };

    tradingService.executeStrategy(
      symbol,
      strategy,
      data,
      balance,
      handlePositionUpdate
    );
  }, [data, selectedStrategy, isRunning, symbol, balance]);

  // Mémoriser les positions pour le graphique
  const positions = useMemo(() => {
    return currentPosition ? [currentPosition] : [];
  }, [currentPosition]);

  const handleStrategyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStrategy(event.target.value);
    setCurrentPosition(null);
  };

  const toggleSimulation = () => {
    setIsRunning(!isRunning);
    if (!isRunning) {
      setBalance(initialBalance);
      setCurrentPosition(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-500 p-4 rounded mb-4">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                onClick={() => loadDataWithRetry()}
                variant="outline"
                size="sm"
              >
                Réessayer
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <h2 className="text-lg font-medium">Simulation en Direct</h2>
            <div className="text-sm text-gray-400">
              Dernière mise à jour: {new Date(lastUpdate).toLocaleTimeString()}
            </div>
          </div>
          <Button
            onClick={toggleSimulation}
            variant={isRunning ? 'outline' : 'default'}
          >
            {isRunning ? 'Arrêter' : 'Démarrer'}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Stratégie</label>
            <select
              className="w-full p-2 bg-gray-700 rounded border border-gray-600"
              value={selectedStrategy}
              onChange={handleStrategyChange}
              disabled={isRunning}
            >
              {strategies.map(strategy => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Balance</label>
            <div className="text-2xl font-medium">
              {formatPrice(balance)}
              <span className="text-sm text-gray-400 ml-2">
                ({formatPercent((balance - initialBalance) / initialBalance * 100)})
              </span>
            </div>
          </div>
        </div>

        {currentPosition && (
          <div className="bg-gray-700 p-4 rounded mb-4">
            <h3 className="font-medium mb-2">Position Actuelle</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Type:</span>
                <span className="ml-2">{currentPosition.side}</span>
              </div>
              <div>
                <span className="text-gray-400">Prix d'entrée:</span>
                <span className="ml-2">{formatPrice(currentPosition.entryPrice)}</span>
              </div>
              <div>
                <span className="text-gray-400">Quantité:</span>
                <span className="ml-2">{currentPosition.quantity}</span>
              </div>
              <div>
                <span className="text-gray-400">PnL:</span>
                <span className={`ml-2 ${currentPosition.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatPercent(currentPosition.unrealizedPnL)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="h-[400px]">
          <TradingView
            symbol={symbol}
            data={displayData}
            positions={positions}
            initialBalance={initialBalance}
            currentBalance={balance}
            timeframe={timeframe}
            onTimeframeChange={onTimeframeChange}
          />
        </div>
      </Card>
    </div>
  );
};