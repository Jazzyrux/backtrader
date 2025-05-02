import backtrader as bt

class SmaCrossStrategy(bt.Strategy):
    params = (
        ('short_period', 20),
        ('long_period', 50),
        ('stop_loss', 0.02),
        ('take_profit', 0.05),
    )

    def __init__(self):
        self.short_sma = bt.indicators.SMA(
            self.data.close, period=self.params.short_period
        )
        self.long_sma = bt.indicators.SMA(
            self.data.close, period=self.params.long_period
        )
        self.crossover = bt.indicators.CrossOver(self.short_sma, self.long_sma)
        
        self.order = None
        self.stop_loss_price = None
        self.take_profit_price = None

    def next(self):
        if self.order:
            return

        if self.crossover > 0:  # Signal d'achat
            self.order = self.buy()
            self.stop_loss_price = self.data.close[0] * (1 - self.params.stop_loss)
            self.take_profit_price = self.data.close[0] * (1 + self.params.take_profit)
            
        elif self.crossover < 0:  # Signal de vente
            self.order = self.sell()
            self.stop_loss_price = self.data.close[0] * (1 + self.params.stop_loss)
            self.take_profit_price = self.data.close[0] * (1 - self.params.take_profit)

        # Gestion du stop loss et take profit
        if self.position:
            if self.position.size > 0:  # Position longue
                if self.data.close[0] <= self.stop_loss_price or \
                   self.data.close[0] >= self.take_profit_price:
                    self.close()
            else:  # Position courte
                if self.data.close[0] >= self.stop_loss_price or \
                   self.data.close[0] <= self.take_profit_price:
                    self.close() 