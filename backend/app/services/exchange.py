from typing import Dict, List
import ccxt
from datetime import datetime

class ExchangeService:
    def __init__(self):
        self.exchange = ccxt.binance({
            'enableRateLimit': True,
            'options': {
                'defaultType': 'future',  # pour le trading de futures
            }
        })
        
    async def get_balance(self) -> Dict:
        return self.exchange.fetch_balance()
        
    async def create_order(self, symbol: str, type: str, side: str, amount: float, price: float = None):
        return self.exchange.create_order(
            symbol=symbol,
            type=type,
            side=side,
            amount=amount,
            price=price
        )
        
    async def get_positions(self) -> List[Dict]:
        return self.exchange.fetch_positions() 