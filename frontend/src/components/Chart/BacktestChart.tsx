import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import type { OHLCV, BacktestResult } from '@/types/trading';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { TimeFrame } from '@/services/binance';

interface BacktestChartProps {
  timeframe: TimeFrame;
  data: OHLCV[];
  indicators?: Record<string, number[]>;
  onTimeframeChange?: (timeframe: TimeFrame) => void;
  backtestResult?: BacktestResult;
}

export const BacktestChart: React.FC<BacktestChartProps> = ({
  timeframe,
  data,
  indicators,
  onTimeframeChange,
  backtestResult
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Nettoyer l'ancien graphique si il existe
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      indicatorSeriesRef.current.clear();
    }

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
        mode: 1,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2B2B43',
        fixLeftEdge: true,
        fixRightEdge: true,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Mettre à jour les données immédiatement si disponibles
    if (data.length > 0) {
      const formattedData = data.map(candle => ({
        time: (candle.timestamp / 1000) as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
      }));
      candlestickSeries.setData(formattedData);
      chart.timeScale().fitContent();
    }

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
        chart.timeScale().fitContent();
      }
    };

    window.addEventListener('resize', handleResize);

    // Nettoyer le graphique lors du démontage ou du rechargement HMR
    const cleanup = () => {
      window.removeEventListener('resize', handleResize);
      if (chart) {
        try {
          chart.remove();
        } catch (error) {
          console.warn('Erreur lors du nettoyage du graphique:', error);
        }
        chartRef.current = null;
        candlestickSeriesRef.current = null;
        indicatorSeriesRef.current.clear();
      }
    };

    // Écouter l'événement de rechargement HMR
    if (import.meta.hot) {
      import.meta.hot.dispose(cleanup);
    }

    return cleanup;
  }, []); // Ne recréer le graphique qu'une seule fois

  useEffect(() => {
    if (!candlestickSeriesRef.current || !data.length || !chartRef.current) return;

    try {
      const formattedData = data.map(candle => ({
        time: (candle.timestamp / 1000) as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
      }));

      candlestickSeriesRef.current.setData(formattedData);
      chartRef.current.timeScale().fitContent();
    } catch (error) {
      console.warn('Erreur lors de la mise à jour des données:', error);
    }
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || !indicators || !data.length) return;

    // Nettoyer les anciennes séries
    indicatorSeriesRef.current.forEach(series => {
      if (chartRef.current) {
        chartRef.current.removeSeries(series);
      }
    });
    indicatorSeriesRef.current.clear();

    // Ajouter les nouveaux indicateurs
    Object.entries(indicators).forEach(([name, values]) => {
      if (!chartRef.current || !Array.isArray(values)) return;

      const series = chartRef.current.addLineSeries({
        color: getIndicatorColor(name),
        lineWidth: 2,
        title: name,
        priceFormat: {
          type: 'price',
          precision: name.includes('RSI') || name.includes('stoch') ? 0 : 2,
          minMove: name.includes('RSI') || name.includes('stoch') ? 1 : 0.01,
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
      } else if (chartRef.current) {
        chartRef.current.removeSeries(series);
      }
    });

    chartRef.current.timeScale().fitContent();
  }, [indicators, data]);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !backtestResult?.trades?.length) return;

    const markers = backtestResult.trades.map(trade => ({
      time: (trade.timestamp / 1000) as UTCTimestamp,
      position: 'belowBar' as const,
      color: trade.profit >= 0 ? '#26a69a' : '#ef5350',
      shape: trade.type === 'long' ? 'arrowUp' as const : 'arrowDown' as const,
      text: `${trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}%`,
      size: 2
    }));

    candlestickSeriesRef.current.setMarkers(markers);

    if (chartRef.current) {
      chartRef.current.timeScale().resetTimeScale();
      chartRef.current.timeScale().scrollToPosition(0, false);
    }
  }, [backtestResult?.trades]);

  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
        chartRef.current.timeScale().resetTimeScale();
        chartRef.current.timeScale().scrollToPosition(0, false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
                onClick={() => onTimeframeChange?.(tf as TimeFrame)}
              >
                {tf}
              </Button>
            ))}
          </div>
          {backtestResult && (
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-gray-400">Initial:</span>
                <span className="ml-2 font-semibold">
                  ${backtestResult.initialBalance?.toFixed(2)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">Final:</span>
                <span className={`ml-2 font-semibold ${
                  backtestResult.finalBalance > backtestResult.initialBalance ? 'text-green-500' : 'text-red-500'
                }`}>
                  ${backtestResult.finalBalance?.toFixed(2)}
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
        className="w-full rounded-lg overflow-hidden"
        style={{ minHeight: '600px' }}
      />
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
    'atr': '#795548'
  };
  return colors[name] || '#999999';
}; 