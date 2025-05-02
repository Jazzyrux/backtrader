import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi } from 'lightweight-charts';
import { binanceService } from '@/services/binance';

interface MiniChartProps {
  symbol: string;
  positive: boolean;
}

export const MiniChart: React.FC<MiniChartProps> = ({ symbol, positive }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: 120,
      height: 60,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: 'transparent',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: { visible: false },
    });

    const lineSeries = chart.addLineSeries({
      color: positive ? '#26a69a' : '#ef5350',
      lineWidth: 2,
    });

    const loadData = async () => {
      const data = await binanceService.getKlines(symbol, '5m', 100);
      lineSeries.setData(
        data.map(candle => ({
          time: candle.time,
          value: candle.close,
        }))
      );
    };

    loadData();
    chartRef.current = chart;

    return () => {
      chart.remove();
    };
  }, [symbol, positive]);

  return <div ref={chartContainerRef} />;
}; 