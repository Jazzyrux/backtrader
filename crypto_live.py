import backtrader as bt
from datetime import datetime
import ccxt

# Créer une classe pour le feed de données en direct
class CCXTStore(bt.Store):
    def __init__(self):
        self.exchange = ccxt.binance({
            'enableRateLimit': True,
            'rateLimit': 1200  # Pour éviter les limitations de l'API
        })

# Initialiser cerebro
cerebro = bt.Cerebro()

# Configurer le store CCXT
store = CCXTStore()

# Liste des paires à suivre
pairs = [
    'BTC/USDT',    # Bitcoin
    'ETH/USDT',    # Ethereum
    'XRP/USDT',    # Ripple
    'SOL/USDT',    # Solana
    'DOGE/USDT',   # Dogecoin
]

# Ajouter chaque paire au cerebro
for pair in pairs:
    data = store.getdata(
        dataname=pair,
        timeframe=bt.TimeFrame.Minutes,
        compression=1,  # données par minute
        live=True
    )
    cerebro.adddata(data)

# Note: BERACHAIN n'est pas encore listé sur Binance
# Nous pourrions ajouter d'autres exchanges qui le supportent

# Définir le capital initial
cerebro.broker.setcash(100000.0)

# Configuration de l'affichage
cerebro.run(stdstats=True)  # Activer les statistiques standard

# Afficher l'interface graphique avec des chandeliers
cerebro.plot(style='candle', volume=True, barup='green', bardown='red') 