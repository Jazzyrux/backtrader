import { IChartApi, UTCTimestamp } from 'lightweight-charts';
import type { OHLCV } from '@/types/trading';

interface IndicatorProps {
  chartInstance: IChartApi;
  data: OHLCV[];
}

interface LineData {
  time: UTCTimestamp;
  value: number;
}

export const calculateSMA = (data: OHLCV[], period: number): LineData[] => {
  const sma: LineData[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, candle) => acc + candle.close, 0);
    sma.push({
      time: (data[i].timestamp / 1000) as UTCTimestamp,
      value: sum / period
    });
  }
  return sma;
};

export const calculateRSI = (data: OHLCV[], period: number = 14): LineData[] => {
  const rsi: LineData[] = [];
  const changes = data.slice(1).map((candle, i) => {
    const prevClose = data[i].close;
    return candle.close - prevClose;
  });

  let avgGain = changes.slice(0, period).reduce((acc, change) => {
    return acc + (change > 0 ? change : 0);
  }, 0) / period;

  let avgLoss = changes.slice(0, period).reduce((acc, change) => {
    return acc + (change < 0 ? -change : 0);
  }, 0) / period;

  // First RSI value
  let rs = avgGain / avgLoss;
  rsi.push({
    time: (data[period].timestamp / 1000) as UTCTimestamp,
    value: 100 - (100 / (1 + rs))
  });

  // Rest of RSI values using Wilder's smoothing
  for (let i = period + 1; i < data.length; i++) {
    const change = changes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;

    rs = avgGain / avgLoss;
    rsi.push({
      time: (data[i].timestamp / 1000) as UTCTimestamp,
      value: 100 - (100 / (1 + rs))
    });
  }

  return rsi;
};

export const addIndicator = (
  chart: IChartApi,
  data: OHLCV[],
  type: 'sma' | 'rsi',
  params: { period?: number } = {}
) => {
  const period = params.period || 14;
  const indicatorData = type === 'sma' 
    ? calculateSMA(data, period)
    : calculateRSI(data, period);

  const lineSeries = chart.addLineSeries({
    color: type === 'sma' ? '#2962FF' : '#E91E63',
    lineWidth: 2,
  });

  lineSeries.setData(indicatorData);
  return lineSeries;
};

export const TechnicalIndicators: React.FC<IndicatorProps> = ({ chartInstance, data }) => {
  const addSMA = (period: number) => {
    const smaData = calculateSMA(data, period);
    const lineSeries = chartInstance.addLineSeries({
      color: 'rgba(4, 111, 232, 1)',
      lineWidth: 2,
    });
    lineSeries.setData(smaData);
  };

  const addRSI = () => {
    const rsiData = calculateRSI(data);
    const lineSeries = chartInstance.addLineSeries({
      color: 'rgba(255, 99, 132, 1)', 
      lineWidth: 2,
      priceScaleId: 'right',
    });
    lineSeries.setData(rsiData);
  };

  return (
    <div className="flex space-x-2 mt-4">
      <button
        onClick={() => addSMA(20)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Add SMA(20)
      </button>
      <button
        onClick={() => addRSI()}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Add RSI
      </button>
    </div>
  );
}; 