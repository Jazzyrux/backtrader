import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CrosshairMode, UTCTimestamp } from 'lightweight-charts';
import { binanceService, type TimeFrame } from '@/services/binance';
import type { OHLCV, BacktestResult, Position } from '@/types/trading';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface TradingViewProps {
  symbol: string;
  initialData?: OHLCV[];
  data?: OHLCV[];
  timeframe?: TimeFrame;
  defaultTimeframe?: TimeFrame;
  onTimeframeChange?: (timeframe: TimeFrame) => void;
  backtestResult?: BacktestResult;
  indicators?: Record<string, number[]>;
  positions?: Position[];
  trades?: Position[];
  initialBalance?: number;
  currentBalance?: number;
}

export const TradingView: React.FC<TradingViewProps> = ({
  symbol,
  initialData = [],
  data: externalData,
  timeframe: externalTimeframe,
  defaultTimeframe = '1h',
  onTimeframeChange,
  backtestResult,
  indicators,
  positions = [],
  trades,
  initialBalance,
  currentBalance
}) => {
  const [data, setData] = useState<OHLCV[]>(initialData);
  const [timeframe, setTimeframe] = useState<TimeFrame>(externalTimeframe || defaultTimeframe);
  const [isLoading, setIsLoading] = useState(true);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const isDisposed = useRef(false);

  // Utiliser les données externes si fournies
  useEffect(() => {
    if (externalData?.length) {
      setData(externalData);
    }
  }, [externalData]);

  // Utiliser le timeframe externe si fourni
  useEffect(() => {
    if (externalTimeframe) {
      setTimeframe(externalTimeframe);
    }
  }, [externalTimeframe]);

  // Nettoyer le graphique
  const cleanupChart = useCallback(() => {
    if (chartRef.current && !isDisposed.current) {
      isDisposed.current = true;
      chartRef.current.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      indicatorSeriesRef.current.clear();
    }
  }, []);

  // Initialiser le graphique
  useEffect(() => {
    if (!chartContainerRef.current) return;

    cleanupChart();
    isDisposed.current = false;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 600,
      layout: {
        background: { color: '#1a1a1a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2B2B43',
        fixLeftEdge: true,
        fixRightEdge: true,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const handleResize = () => {
      if (chartContainerRef.current && chart && !isDisposed.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cleanupChart();
    };
  }, [cleanupChart]);

  // Mettre à jour les données
  useEffect(() => {
    if (!chartRef.current || !data.length || isDisposed.current) return;

    try {
      const formattedData = data.map(candle => ({
        time: (candle.timestamp / 1000) as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
      }));

      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(formattedData);
      }

      if (!isDisposed.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des données:', error);
    }

    setIsLoading(false);
  }, [data]);

  // Mettre à jour les indicateurs
  useEffect(() => {
    if (!chartRef.current || !indicators || isDisposed.current) return;

    try {
      // Nettoyer les anciennes séries
      indicatorSeriesRef.current.forEach(series => {
        if (!isDisposed.current && chartRef.current) {
          chartRef.current.removeSeries(series);
        }
      });
      indicatorSeriesRef.current.clear();

      // Ajouter les nouveaux indicateurs
      Object.entries(indicators || {}).forEach(([name, values]) => {
        if (!Array.isArray(values)) {
          console.error(`L'indicateur ${name} n'a pas de données valides`);
          return;
        }
        if (isDisposed.current || !chartRef.current) return;

        const series = chartRef.current.addLineSeries({
          color: getIndicatorColor(name),
          lineWidth: 2,
          title: name,
          priceFormat: {
            type: 'price',
            precision: name.includes('RSI') ? 0 : 2,
            minMove: name.includes('RSI') ? 1 : 0.01,
          },
        });

        const indicatorData = values
          .map((value, index) => {
            if (value === null || value === undefined || isNaN(value) || index >= data.length) return null;
            return {
              time: (data[index].timestamp / 1000) as UTCTimestamp,
              value: value
            };
          })
          .filter((point): point is { time: UTCTimestamp; value: number } => 
            point !== null
          );

        if (indicatorData.length > 0) {
          series.setData(indicatorData);
          indicatorSeriesRef.current.set(name, series);
        } else if (!isDisposed.current && chartRef.current) {
          chartRef.current.removeSeries(series);
        }
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des indicateurs:', error);
    }
  }, [indicators, data]);

  // Chargement initial des données
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const historicalData = await binanceService.getHistoricalData(symbol, timeframe)
          .catch(error => {
            console.error('Erreur critique:', error);
            return [];
          });
        setData(historicalData);
      } finally {
        setIsLoading(false);
      }
    };

    if (initialData.length === 0) {
      loadInitialData();
    }
  }, [symbol, timeframe, initialData]);

  // Mise à jour en temps réel
  useEffect(() => {
    const unsubscribe = binanceService.subscribeToKlines(symbol, timeframe, (newData) => {
      setData(newData);
    });

    return () => unsubscribe();
  }, [symbol, timeframe]);

  // Afficher les trades
  useEffect(() => {
    if (!candlestickSeriesRef.current || !trades?.length) return;

    const markers = trades.map(trade => ({
      time: (trade.timestamp / 1000) as UTCTimestamp,
      position: trade.side === 'LONG' ? 'belowBar' as const : 'aboveBar' as const,
      color: trade.side === 'LONG' ? '#26a69a' : '#ef5350',
      shape: trade.side === 'LONG' ? 'arrowUp' as const : 'arrowDown' as const,
      text: `${trade.side} @ ${trade.entryPrice.toFixed(2)}`,
      size: 2
    }));

    candlestickSeriesRef.current.setMarkers(markers);
  }, [trades]);

  // Afficher les positions
  useEffect(() => {
    if (!candlestickSeriesRef.current || !positions.length) return;

    const markers = positions.map(position => ({
      time: (position.timestamp / 1000) as UTCTimestamp,
      position: position.side === 'LONG' ? 'belowBar' as const : 'aboveBar' as const,
      color: position.side === 'LONG' ? '#26a69a' : '#ef5350',
      shape: position.side === 'LONG' ? 'arrowUp' as const : 'arrowDown' as const,
      text: `${position.side} @ ${position.entryPrice.toFixed(2)}`,
      size: 2
    }));

    candlestickSeriesRef.current.setMarkers(markers);
  }, [positions]);

  // Afficher les balances dans l'en-tête
  const renderBalances = () => {
    if (!initialBalance || !currentBalance) return null;

    return (
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <span className="text-gray-400">Initial:</span>
          <span className="ml-2 font-semibold">
            ${initialBalance.toFixed(2)}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-gray-400">Actuel:</span>
          <span className={`ml-2 font-semibold ${
            currentBalance > initialBalance ? 'text-green-500' : 'text-red-500'
          }`}>
            ${currentBalance.toFixed(2)}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-gray-400">P&L:</span>
          <span className={`ml-2 font-semibold ${
            currentBalance >= initialBalance ? 'text-green-500' : 'text-red-500'
          }`}>
            {((currentBalance - initialBalance) / initialBalance * 100).toFixed(2)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card className="relative">
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setTimeframe(tf as TimeFrame);
                  onTimeframeChange?.(tf as TimeFrame);
                }}
              >
                {tf}
              </Button>
            ))}
          </div>
          {renderBalances()}
          {backtestResult && (
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-gray-400">Final:</span>
                <span className={`ml-2 font-semibold ${
                  backtestResult.finalBalance > backtestResult.initialBalance ? 'text-green-500' : 'text-red-500'
                }`}>
                  ${backtestResult.finalBalance.toFixed(2)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">Retour:</span>
                <span className={`ml-2 font-semibold ${
                  backtestResult.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {(backtestResult.totalReturn * 100).toFixed(2)}%
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">Drawdown:</span>
                <span className="ml-2 font-semibold text-red-500">
                  {(backtestResult.maxDrawdown * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div 
        ref={chartContainerRef} 
        className="w-full"
        style={{ height: '600px' }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white">Chargement du graphique...</div>
        </div>
      )}
    </Card>
  );
};

const getIndicatorColor = (name: string): string => {
  const colors: Record<string, string> = {
    'gma': '#2962FF',
    'upper': '#4CAF50',
    'lower': '#F44336',
    'middle': '#2196F3',
    'rsi': '#FF9800',
    'stochK': '#9C27B0',
    'stochD': '#673AB7',
    'ema50': '#00BCD4',
    'atr': '#795548',
    'fastSMA': '#2962FF',
    'slowSMA': '#FF6D00'
  };
  return colors[name] || '#999999';
}; 