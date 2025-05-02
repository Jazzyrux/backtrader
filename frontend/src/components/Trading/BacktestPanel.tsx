import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { TradingView } from '@/components/Trading/TradingView';
import { StrategySelector } from '@/components/Strategy/StrategySelector';
import { RiskControls } from '@/components/Strategy/RiskControls';
import { MetricsMenu } from '@/components/Strategy/MetricsMenu';
import type { Strategy, BacktestResult, OHLCV, Position } from '@/types/trading';
import { binanceService, type TimeFrame } from '@/services/binance';
import { tradingService } from '@/services/trading';
import { getStrategies } from '@/strategies';

interface BacktestPosition {
  type: 'long' | 'short';
  entry: number;
  exit: number;
  profit: number;
  timestamp: number;
  reason?: 'stop_loss' | 'take_profit' | 'signal' | 'trailing_stop' | 'target_reached';
}

interface PaginatedBacktestResult {
  currentPage: number;
  totalPages: number;
  positionsPerPage: number;
  initialBalance: number;
  finalBalance: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: BacktestPosition[];
  indicators: Record<string, number[]>;
}

interface BacktestProgress {
  trades?: BacktestPosition[];
  indicators?: Record<string, number[]>;
}

interface BacktestPanelProps {
  symbol: string;
  timeframe?: TimeFrame;
  onTimeframeChange?: (timeframe: TimeFrame) => void;
}

export const BacktestPanel: React.FC<BacktestPanelProps> = ({
  symbol,
  timeframe = '1h',
  onTimeframeChange
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [initialCapital, setInitialCapital] = useState(10000);
  const [historicalData, setHistoricalData] = useState<OHLCV[]>([]);
  const [displayData, setDisplayData] = useState<OHLCV[]>([]);
  const [backtestResult, setBacktestResult] = useState<PaginatedBacktestResult>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const updateInterval = useRef<NodeJS.Timeout>();
  const retryCount = useRef(0);
  const maxRetries = 3;
  const accumulatedResults = useRef<{
    trades: BacktestPosition[];
    indicators: Record<string, number[]>;
  }>({ trades: [], indicators: {} });

  const loadHistoricalDataWithRetry = async (retryAttempt = 0): Promise<void> => {
    try {
      setError(null);
      setIsLoading(true);
      const data = await binanceService.getKlines(
        symbol,
        '1m',
        startDate.getTime(),
        endDate.getTime()
      );
      setHistoricalData(data);
      retryCount.current = 0;
    } catch (error) {
      console.error('Erreur lors du chargement des données historiques:', error);
      if (retryAttempt < maxRetries) {
        const delay = Math.pow(2, retryAttempt) * 1000;
        console.log(`Nouvelle tentative dans ${delay/1000} secondes... (Tentative ${retryAttempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadHistoricalDataWithRetry(retryAttempt + 1);
      }
      setError('Impossible de charger les données historiques. Veuillez réessayer plus tard.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDisplayDataWithRetry = async (retryAttempt = 0): Promise<void> => {
    try {
      setError(null);
      const data = await binanceService.getKlines(
        symbol,
        timeframe,
        startDate.getTime(),
        endDate.getTime()
      );
      setDisplayData(data);
    } catch (error) {
      console.error('Erreur lors du chargement des données d\'affichage:', error);
      if (retryAttempt < maxRetries) {
        const delay = Math.pow(2, retryAttempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadDisplayDataWithRetry(retryAttempt + 1);
      }
      setError('Impossible de charger les données d\'affichage. Veuillez réessayer plus tard.');
    }
  };

  useEffect(() => {
    loadHistoricalDataWithRetry();
  }, [symbol, startDate, endDate]);

  useEffect(() => {
    loadDisplayDataWithRetry();
  }, [symbol, timeframe, startDate, endDate]);

  // Transformer les indicateurs au format attendu
  const transformedIndicators = useMemo(() => {
    if (!backtestResult?.indicators) return {};
    return backtestResult.indicators;
  }, [backtestResult]);

  // Mémoriser les positions transformées
  const transformedPositions = useMemo(() => {
    if (!backtestResult?.trades) return [];
    return backtestResult.trades.map((p: BacktestPosition) => ({
      symbol,
      side: p.type === 'long' ? ('LONG' as const) : ('SHORT' as const),
      entryPrice: p.entry,
      exitPrice: p.exit,
      quantity: Math.abs(p.profit / (p.exit - p.entry)),
      unrealizedPnL: p.profit,
      timestamp: p.timestamp,
      exitTimestamp: p.timestamp + 60000,
      exitReason: p.reason,
      stopLoss: undefined,
      takeProfit: undefined
    } as Position));
  }, [backtestResult, symbol]);

  const runBacktest = async () => {
    if (!selectedStrategy || historicalData.length === 0) return;

    setIsLoading(true);
    setProgress(0);
    setProgressStep('');
    setError(null);

    updateInterval.current = setInterval(() => {
      if (accumulatedResults.current) {
        setBacktestResult(prev => prev ? {
          ...prev,
          trades: [...accumulatedResults.current.trades],
          indicators: { ...accumulatedResults.current.indicators }
        } : undefined);
      }
    }, 2000);

    try {
      const result = await tradingService.backtestStrategy(
        symbol,
        '1m',
        selectedStrategy,
        initialCapital,
        startDate.getTime(),
        endDate.getTime(),
        currentPage,
        (step: string, percent: number, intermediateResults?: BacktestProgress) => {
          setProgressStep(step);
          setProgress(percent);
          if (intermediateResults) {
            accumulatedResults.current = {
              trades: intermediateResults.trades || [],
              indicators: intermediateResults.indicators || {}
            };
          }
        }
      ) as PaginatedBacktestResult;

      setBacktestResult(result);
    } catch (error) {
      console.error('Erreur lors du backtest:', error);
      setError('Une erreur est survenue lors du backtest. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    }
  };

  // Nettoyage de l'intervalle lors du démontage
  useEffect(() => {
    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, []);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    runBacktest();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {error && (
        <div className="lg:col-span-3">
          <div className="bg-red-900/20 border border-red-500 text-red-500 p-4 rounded">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                onClick={() => error.includes('historiques') ? loadHistoricalDataWithRetry() : runBacktest()}
                variant="outline"
                size="sm"
              >
                Réessayer
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="lg:col-span-2">
        <Card className="p-4">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold">Graphique</h3>
            {selectedStrategy && (
              <MetricsMenu
                strategy={selectedStrategy}
                onMetricsChange={console.log}
              />
            )}
          </div>
          <div className="w-full" style={{ height: '600px' }}>
            <TradingView
              symbol={symbol}
              data={displayData}
              timeframe={timeframe}
              positions={transformedPositions}
              indicators={transformedIndicators}
              onTimeframeChange={onTimeframeChange}
              initialBalance={initialCapital}
              currentBalance={backtestResult ? initialCapital * (1 + backtestResult.totalReturn / 100) : undefined}
            />
          </div>
        </Card>

        {backtestResult && (
          <Card className="mt-6 p-4">
            <h3 className="text-lg font-semibold mb-4">Résultats du Backtest</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 p-3 rounded-lg">
                <div className="text-sm text-gray-400">Retour Total</div>
                <div className={`text-lg font-semibold ${
                  backtestResult.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {backtestResult.totalReturn.toFixed(2)}%
                </div>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg">
                <div className="text-sm text-gray-400">Drawdown Maximum</div>
                <div className="text-lg font-semibold text-red-500">
                  {backtestResult.maxDrawdown.toFixed(2)}%
                </div>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg">
                <div className="text-sm text-gray-400">Ratio de Sharpe</div>
                <div className="text-lg font-semibold">
                  {backtestResult.sharpeRatio.toFixed(2)}
                </div>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg">
                <div className="text-sm text-gray-400">Nombre Total de Trades</div>
                <div className="text-lg font-semibold">
                  {backtestResult.positionsPerPage * backtestResult.totalPages}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Configuration</h3>
          <div className="space-y-4">
            <StrategySelector
              selectedStrategy={selectedStrategy}
              onStrategyChange={setSelectedStrategy}
              strategies={getStrategies()}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date de début</label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date de fin</label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  className="w-full"
                />
              </div>
            </div>

            <Input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              placeholder="Capital initial"
            />

            {selectedStrategy && (
              <RiskControls
                strategy={selectedStrategy}
                onRiskParamsChange={console.log}
                initialBalance={initialCapital}
              />
            )}

            <Button
              onClick={runBacktest}
              className="w-full mb-2"
              disabled={!selectedStrategy || isLoading}
            >
              {isLoading ? 'Exécution...' : 'Lancer le backtest'}
            </Button>
            {isLoading && (
              <div className="space-y-2">
                <div className="text-sm text-gray-400 text-center">{progressStep}</div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {backtestResult && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Historique des Trades</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {backtestResult.trades.map((trade: BacktestPosition, index: number) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    trade.profit >= 0 ? 'bg-green-900/20' : 'bg-red-900/20'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">
                        {trade.type.toUpperCase()} @ {trade.entry.toFixed(2)}
                      </span>
                      <div className="text-sm text-gray-400">
                        {new Date(trade.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${
                        trade.profit >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}%
                      </div>
                      <div className="text-sm text-gray-400">
                        Sortie @ {trade.exit.toFixed(2)}
                        {trade.reason && ` (${trade.reason})`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-4 flex justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              <span className="px-4 py-2">
                Page {currentPage} sur {backtestResult.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === backtestResult.totalPages}
              >
                Suivant
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};