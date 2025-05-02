from typing import Dict, List
import pandas as pd
import numpy as np
from dataclasses import dataclass

@dataclass
class MAStrategy:
    short_period: int = 9
    long_period: int = 21
    
    def calculate_signals(self, data: List[Dict]) -> Dict:
        # Convertir les données en DataFrame
        df = pd.DataFrame(data)
        
        # Calculer les moyennes mobiles
        df['ma_fast'] = df['close'].rolling(window=self.short_period).mean()
        df['ma_slow'] = df['close'].rolling(window=self.long_period).mean()
        
        # Générer les signaux
        df['signal'] = 0
        df.loc[df['ma_fast'] > df['ma_slow'], 'signal'] = 1  # Signal d'achat
        df.loc[df['ma_fast'] < df['ma_slow'], 'signal'] = -1  # Signal de vente
        
        # Calculer les indicateurs supplémentaires
        df['rsi'] = self.calculate_rsi(df['close'])
        df['trend_strength'] = self.calculate_trend_strength(df)
        
        return {
            'signals': df['signal'].tolist(),
            'ma_fast': df['ma_fast'].tolist(),
            'ma_slow': df['ma_slow'].tolist(),
            'rsi': df['rsi'].tolist(),
            'trend_strength': df['trend_strength'].tolist()
        }
    
    def calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    def calculate_trend_strength(self, df: pd.DataFrame) -> pd.Series:
        # Calcul de la force de la tendance basé sur l'écart entre les MAs
        return ((df['ma_fast'] - df['ma_slow']).abs() / df['close'] * 100) 