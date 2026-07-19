import yfinance as yf
import pandas as pd
import numpy as np

def calculate_rsi(prices: pd.Series, periods=14):
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=periods).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=periods).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_macd(prices: pd.Series, fast=12, slow=26, signal=9):
    exp1 = prices.ewm(span=fast, adjust=False).mean()
    exp2 = prices.ewm(span=slow, adjust=False).mean()
    macd = exp1 - exp2
    signal_line = macd.ewm(span=signal, adjust=False).mean()
    return macd, signal_line

def scan_market(tickers: list[str]) -> dict:
    """
    Fetches 6 months of historical data and calculates key technical indicators.
    Returns a dictionary mapping each ticker to its calculated metrics.
    """
    if not tickers:
        return {}

    results = {}
    
    for ticker in tickers:
        try:
            # 1. Try fetching the original ticker requested
            df = yf.download(ticker, period="6mo", interval="1d", auto_adjust=True, progress=False)
            
            active_ticker = ticker
            
            # 2. If it failed, try the opposite (add .NS or remove .NS)
            if df.empty or len(df) < 50 or 'Close' not in df:
                alt_t = f"{ticker}.NS" if not ticker.endswith('.NS') else ticker.replace('.NS', '')
                df = yf.download(alt_t, period="6mo", interval="1d", auto_adjust=True, progress=False)
                active_ticker = alt_t
                
            if df.empty or len(df) < 50 or 'Close' not in df:
                print(f"Failed to fetch sufficient data for {ticker}")
                continue
                
            close = df['Close']
            if isinstance(close, pd.DataFrame):
                close = close.iloc[:, 0]
            
            # Current Price
            current_price = float(close.iloc[-1])
            
            # Extract currency
            try:
                currency = yf.Ticker(active_ticker).info.get('currency', 'USD')
            except:
                currency = 'USD'
            
            # Volatility (Annualized)
            returns = close.pct_change().dropna()
            volatility = float(returns.std() * np.sqrt(252))
            
            # Moving Averages
            sma_50 = float(close.rolling(window=50).mean().iloc[-1])
            sma_20 = float(close.rolling(window=20).mean().iloc[-1])
            
            # RSI
            rsi_series = calculate_rsi(close)
            current_rsi = float(rsi_series.iloc[-1])
            
            # MACD
            macd, signal_line = calculate_macd(close)
            current_macd = float(macd.iloc[-1])
            current_signal = float(signal_line.iloc[-1])
            
            # Momentum (1-month return ~21 trading days)
            if len(close) > 21:
                month_return = float((close.iloc[-1] / close.iloc[-21]) - 1)
            else:
                month_return = 0.0
                
            results[ticker] = {
                "current_price": current_price,
                "currency": currency,
                "volatility": volatility,
                "sma_50": sma_50,
                "sma_20": sma_20,
                "rsi_14": current_rsi,
                "macd": current_macd,
                "macd_signal": current_signal,
                "1_month_return": month_return
            }
            
        except Exception as e:
            print(f"Error scanning {ticker}: {e}")
            continue
            
    return results
