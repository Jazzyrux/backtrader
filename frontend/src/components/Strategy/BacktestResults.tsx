import React, { useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { TradingView } from '@/components/Trading/TradingView';
import { MetricsMenu } from './MetricsMenu';
import { StrategyParameters } from './StrategyParameters';
import { useStrategyExecution } from '@/hooks/useStrategyExecution';
import type { BacktestResult, OHLCV, Strategy, Position } from '@/types/trading';
import type { TimeFrame } from '@/services/binance';

interface BacktestResultsProps {
  results: BacktestResult;
  data: OHLCV[];
  strategy: Strategy;
  timeframe: TimeFrame;
  onTimeframeChange: (timeframe: TimeFrame) => void;
  onParametersChange?: (params: Record<string, number>) => void;
}

export const BacktestResults: React.FC<BacktestResultsProps> = ({
  results,
  data: initialData,
  strategy,
  timeframe,
  onTimeframeChange,
  onParametersChange
}) => {
  const [selectedMetrics, setSelectedMetrics] = React.useState<string[]>([]);
  const { metrics, positions } = results;

  const {
    data,
    positions: livePositions,
    balance,
    isLoading,
    error
  } = useStrategyExecution({
    symbol: initialData[0]?.symbol || '',
    strategy,
    timeframe,
    initialBalance: 10000,
    onTradeComplete: (position) => {
      console.log('Trade completed:', position);
    }
  });

  // Utiliser les positions en direct si disponibles, sinon utiliser les positions du backtest
  const trades: Position[] = livePositions.length > 0 ? livePositions : positions.map(pos => ({
    symbol: initialData[0]?.symbol || '',
    side: pos.type === 'long' ? 'LONG' : 'SHORT',
    entryPrice: pos.entry,
    quantity: Math.abs(pos.profit / (pos.exit - pos.entry)),
    unrealizedPnL: pos.profit,
    timestamp: pos.timestamp,
    stopLoss: pos.stopLoss,
    takeProfit: pos.takeProfit,
    exitPrice: pos.exit,
    exitTimestamp: pos.timestamp + 60000, // Ajouter 1 minute pour la sortie
    exitReason: pos.reason
  }));

  // Calculer les indicateurs en fonction des métriques sélectionnées
  const indicators = React.useMemo(() => {
    if (!selectedMetrics.length) return strategy.calculate(data);
    return strategy.calculate(data, selectedMetrics);
  }, [data, selectedMetrics, strategy]);

  if (error) {
    return (
      <Card className="p-4">
        <div className="text-red-500">Erreur: {error}</div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <div>Chargement...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Résultats du Backtest</h3>
              <MetricsMenu
                strategy={strategy}
                onMetricsChange={setSelectedMetrics}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-gray-400">Retour Total</div>
                <div className={`text-xl font-bold ${metrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {metrics.totalReturn.toFixed(2)}%
                </div>
              </div>
              
              <div>
                <div className="text-gray-400">Drawdown Maximum</div>
                <div className="text-xl font-bold text-red-500">
                  {metrics.maxDrawdown.toFixed(2)}%
                </div>
              </div>
              
              <div>
                <div className="text-gray-400">Ratio de Sharpe</div>
                <div className="text-xl font-bold">
                  {metrics.sharpeRatio.toFixed(2)}
                </div>
              </div>
              
              <div>
                <div className="text-gray-400">Taux de Réussite</div>
                <div className="text-xl font-bold">
                  {metrics.winRate.toFixed(2)}%
                </div>
              </div>
              
              <div>
                <div className="text-gray-400">Facteur de Profit</div>
                <div className="text-xl font-bold">
                  {metrics.profitFactor.toFixed(2)}
                </div>
              </div>
            </div>

            <TradingView
              symbol={data[0]?.symbol || ''}
              timeframe={timeframe}
              data={data}
              trades={trades}
              indicators={indicators}
              onTimeframeChange={onTimeframeChange}
              initialBalance={10000}
              currentBalance={balance}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <StrategyParameters
            strategy={strategy}
            onParametersChange={onParametersChange || (() => {})}
          />

          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Historique des Trades</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {trades.map((trade, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    trade.unrealizedPnL >= 0 ? 'bg-green-900/20' : 'bg-red-900/20'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">
                        {trade.side} @ {trade.entryPrice.toFixed(2)}
                      </span>
                      <div className="text-sm text-gray-400">
                        {new Date(trade.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${
                        trade.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {trade.unrealizedPnL >= 0 ? '+' : ''}{trade.unrealizedPnL.toFixed(2)}%
                      </div>
                      {trade.exitPrice && (
                        <div className="text-sm text-gray-400">
                          Sortie @ {trade.exitPrice.toFixed(2)}
                          {trade.exitReason && ` (${trade.exitReason})`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}; 
}; 