from fastapi import APIRouter, HTTPException
from typing import Dict, List
import numpy as np
import pandas as pd
from ..services.market_data import MarketDataService
from flask import Blueprint, jsonify, request
import logging
from datetime import datetime, timedelta

router = APIRouter()
market_data = MarketDataService()

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Création du blueprint
bp = Blueprint('simulation', __name__)

def calculate_metrics(returns: List[float], positions: List[Dict]) -> Dict:
    returns_array = np.array(returns)
    cumulative_returns = np.exp(np.cumsum(returns_array)) - 1
    
    # Calcul du drawdown
    peak = np.maximum.accumulate(cumulative_returns)
    drawdown = (cumulative_returns - peak) / peak
    max_drawdown = np.min(drawdown) if len(drawdown) > 0 else 0
    
    # Calcul des autres métriques
    total_return = cumulative_returns[-1] if len(cumulative_returns) > 0 else 0
    sharpe_ratio = np.mean(returns_array) / np.std(returns_array) * np.sqrt(252) if len(returns_array) > 0 else 0
    
    # Calcul du win rate et profit factor
    winning_trades = len([p for p in positions if p['profit'] > 0])
    total_trades = len(positions)
    win_rate = winning_trades / total_trades if total_trades > 0 else 0
    
    total_profits = sum(p['profit'] for p in positions if p['profit'] > 0)
    total_losses = abs(sum(p['profit'] for p in positions if p['profit'] < 0))
    profit_factor = total_profits / total_losses if total_losses > 0 else float('inf')
    
    return {
        'totalReturn': float(total_return),
        'maxDrawdown': float(max_drawdown),
        'sharpeRatio': float(sharpe_ratio),
        'winRate': float(win_rate),
        'profitFactor': float(profit_factor)
    }

@router.post("/backtest")
async def run_backtest(params: Dict):
    try:
        symbol = params.get('symbol')
        timeframe = params.get('timeframe')
        strategy = params.get('strategy')
        
        # Récupérer les données historiques
        historical_data = await market_data.get_ohlcv(symbol, timeframe)
        
        # Convertir en DataFrame
        df = pd.DataFrame(historical_data)
        
        # Initialiser les listes pour stocker les résultats
        positions = []
        returns = []
        current_position = None
        
        # Appliquer la stratégie
        for i in range(1, len(df)):
            # Calculer les indicateurs selon la stratégie
            if strategy['id'] == 'ma-crossover':
                fast_ma = df['close'].rolling(window=strategy['params']['fastPeriod']).mean()
                slow_ma = df['close'].rolling(window=strategy['params']['slowPeriod']).mean()
                
                # Générer les signaux
                if fast_ma[i] > slow_ma[i] and fast_ma[i-1] <= slow_ma[i-1]:
                    # Signal d'achat
                    if not current_position:
                        current_position = {
                            'entry': df['close'][i],
                            'type': 'long'
                        }
                elif fast_ma[i] < slow_ma[i] and fast_ma[i-1] >= slow_ma[i-1]:
                    # Signal de vente
                    if current_position:
                        exit_price = df['close'][i]
                        profit = (exit_price - current_position['entry']) / current_position['entry']
                        if current_position['type'] == 'short':
                            profit = -profit
                        
                        positions.append({
                            'entry': current_position['entry'],
                            'exit': exit_price,
                            'profit': profit,
                            'type': current_position['type']
                        })
                        current_position = None
            
            # Calculer le rendement quotidien
            daily_return = np.log(df['close'][i] / df['close'][i-1])
            returns.append(float(daily_return))
        
        # Calculer les métriques de performance
        metrics = calculate_metrics(returns, positions)
        
        return {
            'returns': returns,
            'positions': positions,
            'metrics': metrics
        }
        
    except Exception as e:
        print(f"Error in backtest: {str(e)}")  # Ajout de logging
        raise HTTPException(status_code=500, detail=str(e))

@bp.route('/simulate', methods=['POST'])
def simulate():
    try:
        data = request.get_json()
        symbol = data.get('symbol')
        timeframe = data.get('timeframe')
        historical_data = data.get('historicalData', [])
        future_points = data.get('futurePoints', 10)
        
        if not historical_data:
            return jsonify({'error': 'No historical data provided'}), 400
            
        # Simuler des données futures basées sur la volatilité historique
        last_candle = historical_data[-1]
        last_price = last_candle['close']
        
        # Calculer la volatilité historique
        returns = np.diff([candle['close'] for candle in historical_data]) / \
                 np.array([candle['close'] for candle in historical_data[:-1]])
        volatility = np.std(returns)
        
        # Générer des données simulées
        simulated_data = []
        current_price = last_price
        timestamp = last_candle['timestamp']
        
        for i in range(future_points):
            # Simuler un mouvement de prix basé sur la volatilité
            price_change = np.random.normal(0, volatility) * current_price
            new_price = current_price + price_change
            
            # Créer une nouvelle bougie
            candle = {
                'timestamp': timestamp + (i + 1) * 60000,  # Ajouter une minute
                'open': current_price,
                'high': max(current_price, new_price),
                'low': min(current_price, new_price),
                'close': new_price,
                'volume': last_candle['volume'] * (0.5 + np.random.random())
            }
            
            simulated_data.append(candle)
            current_price = new_price
            
        return jsonify(simulated_data)
        
    except Exception as e:
        logger.error(f"Error during simulation: {str(e)}")
        return jsonify({'error': str(e)}), 500