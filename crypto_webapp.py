
import streamlit as st
import backtrader as bt
import ccxt
import pandas as pd
import plotly.graph_objects as go

st.title('Crypto Trading Dashboard')

# Initialiser l'exchange
exchange = ccxt.binance({
    'enableRateLimit': True,
})

# Liste des cryptos à suivre
pairs = ['BTC/USDT', 'ETH/USDT', 'XRP/USDT', 'SOL/USDT', 'DOGE/USDT']

for pair in pairs:
    st.subheader(pair)
    # Récupérer les données
    ohlcv = exchange.fetch_ohlcv(pair, '1m')
    df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
    
    # Créer le graphique
    fig = go.Figure(data=[go.Candlestick(
        x=df['timestamp'],
        open=df['open'],
        high=df['high'],
        low=df['low'],
        close=df['close']
    )])
    
    st.plotly_chart(fig) 