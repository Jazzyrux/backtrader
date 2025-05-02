import React, { useMemo } from 'react';
import { IChartApi, UTCTimestamp } from 'lightweight-charts';
import type { OHLCV, Strategy, IndicatorValue } from '@/types/trading';
import { Card } from '@/components/ui/Card';

interface StrategyIndicatorsProps {
  data: OHLCV[];
  strategy: Strategy;
  chartInstance?: IChartApi;
}

export const StrategyIndicators: React.FC<StrategyIndicatorsProps> = ({
  data,
  strategy,
  chartInstance
}) => {
  const indicators = useMemo(() => {
    const calculateSMA = (prices: number[], period: number): IndicatorValue[] => {
      const sma: IndicatorValue[] = [];
      for (let i = period - 1; i < prices.length; i++) {
        const slice = prices.slice(i - period + 1, i + 1);
        const sum = slice.reduce((acc, val) => acc + val, 0);
        sma.push({
          timestamp: (data[i].timestamp / 1000) as UTCTimestamp,
          value: sum / period
        });
      }
      return sma;
    };

    const calculateRSI = (prices: number[], period: number): IndicatorValue[] => {
      const rsi: IndicatorValue[] = [];
      let gains = 0;
      let losses = 0;

      // Calculer les gains/pertes initiaux
      for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change >= 0) {
          gains += change;
        } else {
          losses -= change;
        }
      }

      gains /= period;
      losses /= period;

      // Calculer le RSI initial
      let rs = gains / losses;
      rsi.push({
        timestamp: (data[period].timestamp / 1000) as UTCTimestamp,
        value: 100 - (100 / (1 + rs))
      });

      // Calculer le reste des valeurs RSI
      for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        gains = ((gains * (period - 1)) + Math.max(0, change)) / period;
        losses = ((losses * (period - 1)) + Math.abs(Math.min(0, change))) / period;

        rs = gains / losses;
        rsi.push({
          timestamp: (data[i].timestamp / 1000) as UTCTimestamp,
          value: 100 - (100 / (1 + rs))
        });
      }

      return rsi;
    };

    const prices = data.map(d => d.close);
    const results = new Map<string, IndicatorValue[]>();

    strategy.indicators.forEach(indicator => {
      switch (indicator.type) {
        case 'SMA':
          results.set(
            indicator.name,
            calculateSMA(prices, indicator.params.period || 20)
          );
          break;
        case 'RSI':
          results.set(
            indicator.name,
            calculateRSI(prices, indicator.params.period || 14)
          );
          break;
        // Ajoutez d'autres types d'indicateurs ici
      }
    });

    return results;
  }, [data, strategy]);

  // Ajouter les indicateurs au graphique si disponible
  React.useEffect(() => {
    if (!chartInstance) return;

    const series = new Map();

    indicators.forEach((values, name) => {
      const lineSeries = chartInstance.addLineSeries({
        color: name.includes('RSI') ? '#E91E63' : '#2962FF',
        lineWidth: 2,
        priceScaleId: name.includes('RSI') ? 'right' : 'left',
        title: name
      });

      const lineData = values.map(v => ({
        time: v.timestamp,
        value: v.value
      }));

      lineSeries.setData(lineData);
      series.set(name, lineSeries);
    });

    return () => {
      series.forEach(series => chartInstance.removeSeries(series));
    };
  }, [chartInstance, indicators]);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Indicateurs</h3>
      <div className="grid grid-cols-2 gap-4">
        {Array.from(indicators.entries()).map(([name, values]) => {
          const lastValue = values[values.length - 1]?.value;
          return (
            <div key={name} className="bg-gray-700 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{name}</span>
                <span className="text-sm">
                  {lastValue?.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}; 