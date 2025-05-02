import React from 'react';
import { Card } from '@/components/ui/Card';
import { TradingView } from '@/components/Trading/TradingView';
import { TradingControls } from '../Trading/TradingControls';
import { MarketOverview } from '../Trading/MarketOverview';
import type { OHLCV, Position, OrderParams } from '@/types/trading';
import type { TimeFrame } from '@/services/binance';

interface TradingPanelProps {
  symbol: string;
  timeframe: TimeFrame;
  data: OHLCV[];
  trades?: Position[];
  indicators?: Record<string, number[]>;
  onTimeframeChange: (timeframe: TimeFrame) => void;
  initialBalance?: number;
  currentBalance?: number;
  onOrderSubmit?: (order: OrderParams) => void;
  children?: React.ReactNode;
}

export const TradingPanel: React.FC<TradingPanelProps> = ({
  symbol,
  timeframe,
  data,
  trades,
  indicators,
  onTimeframeChange,
  initialBalance,
  currentBalance,
  onOrderSubmit,
  children
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-4">
            <TradingView
              symbol={symbol}
              timeframe={timeframe}
              data={data}
              trades={trades}
              indicators={indicators}
              onTimeframeChange={onTimeframeChange}
              initialBalance={initialBalance}
              currentBalance={currentBalance}
            />
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <TradingControls
              symbol={symbol}
              onOrderSubmit={onOrderSubmit}
            />
            <MarketOverview symbol={symbol} />
          </div>
        </div>

        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}; 