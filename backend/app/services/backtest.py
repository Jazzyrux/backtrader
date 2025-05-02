import backtrader as bt
from typing import Dict, List
import pandas as pd
from datetime import datetime, timedelta

class LiveBacktestService:
    def __init__(self):
        self.cerebro = bt.Cerebro()
        self.data_feeds = {}
        self.strategies = {}
        
    def add_strategy(self, strategy_config: Dict):
        """Ajoute une stratégie dynamiquement"""
        class DynamicStrategy(bt.Strategy):
            params = strategy_config.get('params', {})
            
            def __init__(self):
                self.indicators = {}
                for ind in strategy_config.get('indicators', []):
                    self.indicators[ind['name']] = getattr(bt.indicators, ind['type'])(
                        self.data, **ind.get('params', {})
                    )
                    
            def next(self):
                # Logique de trading basée sur strategy_config
                pass
                
        self.cerebro.addstrategy(DynamicStrategy)
        
    async def run_live_backtest(self, market_data: pd.DataFrame):
        """Exécute le backtest sur les dernières données"""
        data = bt.feeds.PandasData(dataname=market_data)
        self.cerebro.adddata(data)
        results = self.cerebro.run()
        return self._format_results(results[0])
        
    def _format_results(self, strategy):
        """Formate les résultats du backtest"""
        return {
            'returns': strategy.analyzers.returns.get_analysis(),
            'positions': strategy.analyzers.positions.get_analysis(),
            'trades': strategy.analyzers.trades.get_analysis(),
        } 