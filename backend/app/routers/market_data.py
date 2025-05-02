from fastapi import APIRouter, HTTPException
from typing import List, Dict
import ccxt
import asyncio
from datetime import datetime
import traceback
import aiohttp
import logging
from flask import Blueprint, jsonify

router = APIRouter()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Création du blueprint
market_data = Blueprint('market_data', __name__)

@market_data.route('/historical/<symbol>')
def get_historical(symbol):
    try:
        exchange = ccxt.binance({
            'enableRateLimit': True,
            'options': {
                'defaultType': 'spot'
            }
        })
        
        formatted_symbol = symbol.upper()
        if not formatted_symbol.endswith('USDT'):
            formatted_symbol += 'USDT'
            
        ohlcv = exchange.fetch_ohlcv(formatted_symbol, '1d', limit=1000)
        
        formatted_data = [{
            'timestamp': candle[0],
            'open': candle[1],
            'high': candle[2],
            'low': candle[3],
            'close': candle[4],
            'volume': candle[5]
        } for candle in ohlcv]
        
        return jsonify(formatted_data)
        
    except Exception as e:
        logger.error(f"Error fetching historical data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@market_data.route('/symbols')
def get_symbols():
    try:
        exchange = ccxt.binance({
            'enableRateLimit': True,
            'options': {
                'defaultType': 'spot'
            }
        })
        
        markets = exchange.load_markets()
        symbols = [
            symbol for symbol in markets.keys() 
            if symbol.endswith('USDT')
        ]
        
        return jsonify(symbols)
        
    except Exception as e:
        logger.error(f"Error fetching symbols: {str(e)}")
        return jsonify({'error': str(e)}), 500

@router.get("/klines")
async def get_klines(symbol: str, interval: str, limit: int = 1000):
    logger.info(f"Received request for klines: symbol={symbol}, interval={interval}, limit={limit}")
    try:
        # Récupérer l'instance de l'échange
        exchange = ccxt.binance({
            'enableRateLimit': True,
            'options': {
                'defaultType': 'spot',
                'adjustForTimeDifference': True
            }
        })
        
        # Formatage du symbole
        formatted_symbol = symbol
        if not formatted_symbol.endswith('USDT'):
            formatted_symbol = f"{formatted_symbol}USDT"
        
        logger.info(f"Formatted symbol: {formatted_symbol}")
        
        # Récupération des données directement de l'API Binance
        endpoint = f"https://api.binance.com/api/v3/klines"
        params = {
            "symbol": formatted_symbol,
            "interval": interval,
            "limit": limit
        }
        
        logger.info(f"Making request to Binance API: {endpoint} with params {params}")
        
        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Binance API error: {error_text}")
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Binance API error: {error_text}"
                    )
                
                data = await response.json()
                
                if not data:
                    logger.warning(f"No data received for {formatted_symbol}")
                    return []
                
                formatted_data = [
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
                
                logger.info(f"Successfully fetched {len(formatted_data)} candles")
                return formatted_data
                
    except Exception as e:
        logger.error(f"Error fetching OHLCV data: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch data: {str(e)}"
        ) 