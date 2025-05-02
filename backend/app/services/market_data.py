from fastapi import HTTPException
from typing import List, Dict
import aiohttp

class MarketDataService:
    def __init__(self):
        self.base_url = "https://api.binance.com/api/v3"

    async def get_ohlcv(self, symbol: str, timeframe: str = '1m', limit: int = 1000) -> List[Dict]:
        try:
            # Formatage du symbole
            formatted_symbol = symbol.replace('/', '')
            
            # Récupération des données
            endpoint = f"{self.base_url}/klines"
            params = {
                "symbol": formatted_symbol,
                "interval": timeframe,
                "limit": limit
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(endpoint, params=params) as response:
                    if response.status != 200:
                        raise HTTPException(
                            status_code=response.status,
                            detail=f"Binance API error: {await response.text()}"
                        )
                    
                    data = await response.json()
                    
                    return [
                        {
                            "timestamp": entry[0],
                            "open": float(entry[1]),
                            "high": float(entry[2]),
                            "low": float(entry[3]),
                            "close": float(entry[4]),
                            "volume": float(entry[5])
                        }
                        for entry in data
                    ]
                    
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) 