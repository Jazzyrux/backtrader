from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler
import numpy as np
from typing import Dict, List
from datetime import datetime

class AIService:
    def __init__(self):
        self.models = {}
        self.scalers = {}

    def prepare_data(self, data: List[Dict], lookback: int = 60):
        prices = np.array([d['close'] for d in data])
        scaler = MinMaxScaler()
        prices_scaled = scaler.fit_transform(prices.reshape(-1, 1))
        
        X, y = [], []
        for i in range(lookback, len(prices_scaled)):
            X.append(prices_scaled[i-lookback:i].ravel())
            y.append(prices_scaled[i])
            
        return np.array(X), np.array(y), scaler

    async def train_model(self, data: List[Dict], strategy: Dict):
        X, y, scaler = self.prepare_data(data, strategy['params']['lookback'])
        model = RandomForestRegressor(
            n_estimators=100,
            random_state=42
        )
        model.fit(X, y.ravel())
        
        self.models[strategy['id']] = model
        self.scalers[strategy['id']] = scaler
        
        return {'status': 'success', 'message': 'Model trained successfully'}

    async def get_prediction(self, data: List[Dict], strategy: Dict):
        model = self.models.get(strategy['id'])
        scaler = self.scalers.get(strategy['id'])
        
        if not model or not scaler:
            raise ValueError('Model not trained')
            
        lookback = strategy['params']['lookback']
        last_data = data[-lookback:]
        X = np.array([d['close'] for d in last_data])
        X_scaled = scaler.transform(X.reshape(-1, 1))
        X_pred = X_scaled.ravel().reshape(1, -1)
        
        pred_scaled = model.predict(X_pred)
        prediction = scaler.inverse_transform(pred_scaled.reshape(-1, 1))[0][0]
        
        return {
            'predictedPrice': float(prediction),
            'confidence': float(model.score(X_pred, pred_scaled)),
            'timestamp': datetime.now().isoformat()
        } 