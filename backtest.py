import backtrader as bt

# Initialiser cerebro
cerebro = bt.Cerebro()

# Définir le capital initial
cerebro.broker.setcash(100000.0)

# Afficher l'interface graphique
cerebro.plot() 