from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import ccxt
import pandas as pd
import backtrader as bt
from datetime import datetime
from .websocket.market_data import MarketDataWebSocket

app = FastAPI()

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialiser l'exchange
exchange = ccxt.binance({
    'enableRateLimit': True,
})

# Liste des cryptos par défaut
DEFAULT_PAIRS = ['BTC/USDT', 'ETH/USDT', 'XRP/USDT', 'SOL/USDT', 'DOGE/USDT']

market_ws = MarketDataWebSocket()

@app.get("/")
def read_root():
    return {"status": "online"}

@app.get("/api/market/pairs")
def get_pairs():
    return {"pairs": DEFAULT_PAIRS}

@app.get("/api/market/price/{symbol}")
async def get_price(symbol: str):
    try:
        ticker = exchange.fetch_ticker(symbol)
        return {
            "symbol": symbol,
            "price": ticker['last'],
            "timestamp": ticker['timestamp']
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/market/ohlcv/{symbol}")
async def get_ohlcv(symbol: str, timeframe: str = "1m"):
    try:
        ohlcv = exchange.fetch_ohlcv(symbol, timeframe)
        df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        return df.to_dict(orient='records')
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/backtest")
async def run_backtest(symbol: str, strategy_params: dict):
    try:
        # Récupérer les données historiques
        ohlcv = exchange.fetch_ohlcv(symbol, '1h', limit=500)
        df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        
        # Configurer le backtest
        cerebro = bt.Cerebro()
        
        # Ajouter les données
        data = bt.feeds.PandasData(
            dataname=df,
            datetime='timestamp',
            open='open',
            high='high',
            low='low',
            close='close',
            volume='volume'
        )
        cerebro.adddata(data)
        
        # Ajouter la stratégie
        cerebro.addstrategy(
            # Ici, vous pouvez ajouter votre stratégie personnalisée
            bt.strategies.SMA_CrossOver,
            # Paramètres de la stratégie
            **strategy_params
        )
        
        # Exécuter le backtest
        results = cerebro.run()
        
        return {
            "status": "success",
            "initial_value": cerebro.broker.startingcash,
            "final_value": cerebro.broker.getvalue(),
            "profit_loss": cerebro.broker.getvalue() - cerebro.broker.startingcash
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.websocket("/ws/market")
async def websocket_endpoint(websocket: WebSocket):
    await market_ws.connect(websocket)
    try:
        await market_ws.fetch_and_broadcast_prices(DEFAULT_PAIRS)
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        market_ws.disconnect(websocket) 