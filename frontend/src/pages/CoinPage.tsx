import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Tabs, TabsList, Tab, TabPanel } from '@/components/ui/Tabs';
import { TradingView } from '@/components/Trading/TradingView';
import { BacktestPanel } from '@/components/Trading/BacktestPanel';
import { LiveSimulation } from '@/components/Trading/LiveSimulation';
import { MarketOverview } from '@/components/Trading/MarketOverview';
import { TradingControls } from '@/components/Trading/TradingControls';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import type { OHLCV } from '@/types/trading';
import { binanceService, type TimeFrame } from '@/services/binance';

export const CoinPage = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<OHLCV[]>([]);
  const [timeframe, setTimeframe] = useState<TimeFrame>('1h');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('trading');

  // Formater le symbole pour enlever le '/'
  const formattedSymbol = symbol?.replace('/', '') || '';

  useEffect(() => {
    if (!symbol) {
      navigate('/markets');
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const historicalData = await binanceService.getKlines(formattedSymbol, timeframe);
        setData(historicalData);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Erreur lors du chargement des données');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [symbol, timeframe, navigate, formattedSymbol]);

  const handleTimeframeChange = (newTimeframe: TimeFrame) => {
    setTimeframe(newTimeframe);
  };

  if (!symbol) return null;
  if (error) return <div className="text-red-500">Erreur: {error}</div>;
  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="heading-1">{symbol}</h1>
          <p className="text-gray-400">Vue d'ensemble et analyse</p>
        </div>
        <MarketOverview symbol={formattedSymbol} />
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <Tab value="trading">Trading</Tab>
          <Tab value="backtest">Backtest</Tab>
          <Tab value="simulation">Simulation en Direct</Tab>
        </TabsList>

        <TabPanel value="trading">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="p-4">
                <TradingView 
                  symbol={formattedSymbol}
                  initialData={data}
                  defaultTimeframe={timeframe}
                  onTimeframeChange={handleTimeframeChange}
                />
              </Card>
            </div>
            <div className="space-y-6">
              <TradingControls 
                symbol={formattedSymbol}
                onOrderSubmit={console.log}
              />
              <MarketOverview symbol={formattedSymbol} />
            </div>
          </div>
        </TabPanel>

        <TabPanel value="backtest">
          <BacktestPanel 
            symbol={formattedSymbol}
            timeframe={timeframe}
            onTimeframeChange={handleTimeframeChange}
          />
        </TabPanel>

        <TabPanel value="simulation">
          <LiveSimulation 
            symbol={formattedSymbol}
            timeframe={timeframe}
            onTimeframeChange={handleTimeframeChange}
          />
        </TabPanel>
      </Tabs>
    </div>
  );
}; 