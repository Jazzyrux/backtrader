from fastapi import WebSocket
import asyncio
import json
from typing import Dict, List
import ccxt

class MarketDataWebSocket:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.exchange = ccxt.binance({
            'enableRateLimit': True
        })
        self.last_prices: Dict[str, float] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

    async def fetch_and_broadcast_prices(self, symbols: List[str]):
        while True:
            try:
                for symbol in symbols:
                    ticker = self.exchange.fetch_ticker(symbol)
                    price = ticker['last']
                    
                    if symbol not in self.last_prices or self.last_prices[symbol] != price:
                        self.last_prices[symbol] = price
                        message = json.dumps({
                            'type': 'price_update',
                            'symbol': symbol,
                            'price': price,
                            'timestamp': ticker['timestamp']
                        })
                        await self.broadcast(message)
                
                await asyncio.sleep(1)  # Attendre 1 seconde
            except Exception as e:
                print(f"Error fetching prices: {e}")
                await asyncio.sleep(5)  # Attendre plus longtemps en cas d'erreur 