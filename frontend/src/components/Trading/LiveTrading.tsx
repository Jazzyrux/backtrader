import { useEffect, useState, useRef } from 'react';
import { TradingView } from '@/components/Trading/TradingView';
import { OrderForm } from './OrderForm';
import { TechnicalIndicators } from '@/components/Indicators/TechnicalIndicators';
import { PriceAlert } from '@/components/Alerts/PriceAlert';
import { binanceService } from '@/services/binance';
import type { OHLCV } from '@/types/trading';
import type { TimeFrame } from '@/services/binance';

interface LiveTradingProps {
  symbol: string;
}

export const LiveTrading = ({ symbol }: LiveTradingProps) => {
  const [data, setData] = useState<OHLCV[]>([]);
  const [timeframe, setTimeframe] = useState<TimeFrame>('1m');
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const chartRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const historicalData = await binanceService.getKlines(symbol, timeframe);
        setData(historicalData);
      } catch (error) {
        console.error('Failed to load historical data:', error);
      }
    };

    loadData();

    const unsubscribe = binanceService.subscribeToKlines(symbol, timeframe, (newData: OHLCV | OHLCV[]) => {
      if (Array.isArray(newData)) {
        setData(newData);
        if (newData.length > 0) {
          setCurrentPrice(newData[newData.length - 1].close);
        }
      } else {
        setData(prevData => {
          const lastIndex = prevData.length - 1;
          if (lastIndex >= 0 && prevData[lastIndex].timestamp === newData.timestamp) {
            return [...prevData.slice(0, -1), newData];
          }
          return [...prevData, newData];
        });
        setCurrentPrice(newData.close);
      }
    });

    return () => unsubscribe();
  }, [symbol, timeframe]);

  const handleTimeframeChange = (newTimeframe: TimeFrame) => {
    setTimeframe(newTimeframe);
  };

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      <div className="col-span-2">
        {data.length > 0 && (
          <>
            <TradingView 
              symbol={symbol}
              data={data}
              timeframe={timeframe}
              onTimeframeChange={handleTimeframeChange}
            />
            {chartRef.current && (
              <TechnicalIndicators 
                chartInstance={chartRef.current}
                data={data}
              />
            )}
          </>
        )}
      </div>
      
      <div className="space-y-4">
        <OrderForm 
          symbol={symbol} 
          onSubmit={console.log} 
        />
        <PriceAlert
          currentPrice={currentPrice}
          symbol={symbol}
          onAlertSet={console.log}
        />
      </div>
    </div>
  );
}; 