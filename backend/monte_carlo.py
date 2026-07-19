import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta

def fetch_data(tickers, lookback_days=252):
    """
    Fetches historical close prices. Automatically retries with '.NS' (NSE India) 
    or without it if the primary fetch fails, ensuring seamless UX for Indian equities.
    """
    end_date = datetime.today()
    start_date = end_date - timedelta(days=lookback_days + 100) # Give buffer for holidays
    
    valid_data = {}
    failed_tickers = []
    
    for t in tickers:
        # 1. Try fetching the original ticker requested
        df = yf.download(t, start=start_date, end=end_date, progress=False)
        
        if not df.empty and 'Close' in df:
            close_col = df['Close']
            if isinstance(close_col, pd.DataFrame):
                close_col = close_col.iloc[:, 0]
                
            if not close_col.isna().all():
                valid_data[t] = close_col
                continue
            
        # 2. If it failed, try the opposite (add .NS or remove .NS)
        alt_t = f"{t}.NS" if not t.endswith('.NS') else t.replace('.NS', '')
        df_alt = yf.download(alt_t, start=start_date, end=end_date, progress=False)
        
        if not df_alt.empty and 'Close' in df_alt:
            close_col_alt = df_alt['Close']
            if isinstance(close_col_alt, pd.DataFrame):
                close_col_alt = close_col_alt.iloc[:, 0]
                
            if not close_col_alt.isna().all():
                valid_data[t] = close_col_alt # Store using the user's originally requested name
                continue
                
        failed_tickers.append(t)
            
    if failed_tickers:
        raise ValueError(f"Could not fetch data for: {', '.join(failed_tickers)}. Please check if they are valid.")
        
    # Combine individual series into a single DataFrame
    data = pd.DataFrame(valid_data)
    
    # Drop rows with NaN to ensure we have overlapping data for correlations
    data = data.dropna()
    
    if data.empty:
        raise ValueError("Not enough overlapping historical data for these tickers.")
    
    # Take the most recent 'lookback_days'
    if len(data) > lookback_days:
        data = data.iloc[-lookback_days:]
        
    return data

def run_simulation(tickers, initial_investment, num_simulations=10000, num_days=252, weights=None):
    """
    Runs a Monte Carlo simulation for a given portfolio using Geometric Brownian Motion
    and Cholesky decomposition to account for asset correlation.
    """
    # 1. Fetch historical data
    prices = fetch_data(tickers)
    num_assets = len(tickers)
    
    # 2. Use equal weights if custom weights are not provided
    if weights is None:
        weights = np.array([1/num_assets] * num_assets)
    else:
        weights = np.array(weights)
    
    # 2. Calculate daily returns
    # The percentage change from one day to the next
    returns = prices.pct_change().dropna()
    
    # 3. Calculate mean returns (mu) and the Covariance Matrix (sigma)
    mean_returns = returns.mean().values
    cov_matrix = returns.cov().values
    
    # Handle single asset edge case where cov_matrix is 0-dimensional
    if num_assets == 1:
        cov_matrix = np.array([[cov_matrix]])
    
    # 4. Prepare the Monte Carlo Engine
    portfolio_sims = np.zeros((num_days, num_simulations))
    portfolio_sims[0] = initial_investment
    
    # 5. Run the Simulation using Geometric Brownian Motion (GBM)
    # L * L^T = Covariance Matrix. We use 'L' to correlate our random noise.
    L = np.linalg.cholesky(cov_matrix)
    
    for day in range(1, num_days):
        # Generate purely random standard normal numbers
        Z = np.random.normal(0, 1, size=(num_assets, num_simulations))
        
        # Apply Cholesky matrix to get correlated random shocks
        correlated_shocks = L @ Z
        
        # Calculate daily drift (mean_returns - 0.5 * variance)
        daily_drift = (mean_returns - 0.5 * np.diag(cov_matrix))
        
        # The simulated daily return for each asset, for each simulation
        asset_returns = np.exp(daily_drift[:, np.newaxis] + correlated_shocks)
        
        # The total portfolio return for this day is the weighted average
        portfolio_return = weights @ asset_returns
        
        # Update the portfolio value for the next day
        portfolio_sims[day] = portfolio_sims[day-1] * portfolio_return
        
    return portfolio_sims

def calculate_var(portfolio_sims, percentile=5):
    """
    Extracts the Value at Risk (VaR) from the final day of the simulations.
    """
    final_values = portfolio_sims[-1, :]
    var_value = np.percentile(final_values, percentile)
    return var_value
