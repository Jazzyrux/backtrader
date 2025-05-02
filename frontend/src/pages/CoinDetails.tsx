import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Tabs, TabsList as TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import { TradingView } from '@/components/Trading/TradingView';
import { BacktestPanel } from '@/components/Trading/BacktestPanel';
import { LiveSimulation } from '@/components/Trading/LiveSimulation';
import { CoinInfo } from '@/components/Trading/CoinInfo';
import { Loading } from '@/components/ui/Loading';
import type { OHLCV } from '@/types/trading';
import { tradingService } from '@/services/trading';

export const CoinPage = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<OHLCV[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trading');

  useEffect(() => {
    if (!symbol) {
      navigate('/markets');
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        const historicalData = await tradingService.getHistoricalData(symbol, '1d');
        setData(historicalData);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [symbol, navigate]);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="heading-1">{symbol}</h1>
          <p className="text-gray-400">Trading View and Analysis</p>
        </div>
        <CoinInfo symbol={symbol!} />
      </header>

      <Tabs defaultValue={activeTab}>
        <TabList>
          <Tab value="trading" onClick={() => setActiveTab('trading')}>Trading View</Tab>
          <Tab value="backtest" onClick={() => setActiveTab('backtest')}>Backtest</Tab>
          <Tab value="simulation" onClick={() => setActiveTab('simulation')}>Live Simulation</Tab>
        </TabList>

        <TabPanel value="trading">
          <div className="bg-gray-800 rounded-lg p-6">
            <TradingView symbol={symbol!} initialData={data} />
          </div>
        </TabPanel>

        <TabPanel value="backtest">
          <div className="bg-gray-800 rounded-lg p-6">
            <BacktestPanel symbol={symbol!} />
          </div>
        </TabPanel>

        <TabPanel value="simulation">
          <div className="bg-gray-800 rounded-lg p-6">
            <LiveSimulation symbol={symbol!} />
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
};