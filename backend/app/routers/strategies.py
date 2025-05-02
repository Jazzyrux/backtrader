from flask import Blueprint, jsonify, request
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Création du blueprint
bp = Blueprint('strategies', __name__)

@bp.route('/backtest', methods=['POST'])
def backtest():
    try:
        data = request.get_json()
        symbol = data.get('symbol')
        timeframe = data.get('timeframe')
        strategy = data.get('strategy')
        
        # Simuler un résultat de backtest pour le moment
        result = {
            'metrics': {
                'totalReturn': 15.5,
                'maxDrawdown': 5.2,
                'sharpeRatio': 1.8,
                'winRate': 65.0,
                'profitFactor': 1.5
            },
            'positions': [
                {
                    'type': 'long',
                    'entry': 50000,
                    'exit': 52000,
                    'profit': 4.0,
                    'timestamp': 1700000000000
                }
            ],
            'returns': [1.2, -0.5, 2.1, -0.8, 1.5]
        }
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error during backtest: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/list')
def list_strategies():
    strategies = [
        {
            'id': 'sma-crossover',
            'name': 'SMA Crossover',
            'description': 'Simple Moving Average Crossover Strategy',
            'indicators': [
                {
                    'type': 'SMA',
                    'name': 'SMA Fast',
                    'params': {'period': 20}
                },
                {
                    'type': 'SMA',
                    'name': 'SMA Slow',
                    'params': {'period': 50}
                }
            ]
        },
        {
            'id': 'rsi-strategy',
            'name': 'RSI Strategy',
            'description': 'Relative Strength Index Strategy',
            'indicators': [
                {
                    'type': 'RSI',
                    'name': 'RSI',
                    'params': {'period': 14}
                }
            ]
        }
    ]
    
    return jsonify(strategies) 