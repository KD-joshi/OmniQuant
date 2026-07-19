import numpy as np
from scipy.stats import norm
import yfinance as yf

def black_scholes_pricing(S, K, T, r, sigma):
    """
    Calculates the Black-Scholes price of a European Call and Put option.
    S: Current stock price
    K: Strike price
    T: Time to maturity (in years)
    r: Risk-free interest rate (annual)
    sigma: Volatility (annualized)
    """
    if T <= 0:
        return max(0.0, S - K), max(0.0, K - S)

    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)

    call_price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
    put_price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)

    return call_price, put_price

def calculate_greeks(S, K, T, r, sigma):
    """
    Calculates the Greeks (Delta, Gamma, Theta, Vega, Rho) for Call and Put options.
    """
    if T <= 0:
        return {
            "call": {"delta": 0, "gamma": 0, "theta": 0, "vega": 0, "rho": 0},
            "put": {"delta": 0, "gamma": 0, "theta": 0, "vega": 0, "rho": 0}
        }
        
    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)

    # Call Greeks
    call_delta = float(norm.cdf(d1))
    gamma = float(norm.pdf(d1) / (S * sigma * np.sqrt(T))) # Gamma is same for Call and Put
    vega = float(S * norm.pdf(d1) * np.sqrt(T) / 100) # Vega usually divided by 100
    
    call_theta = float((- (S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T)) - r * K * np.exp(-r * T) * norm.cdf(d2)) / 365)
    call_rho = float(K * T * np.exp(-r * T) * norm.cdf(d2) / 100)

    # Put Greeks
    put_delta = float(call_delta - 1)
    put_theta = float((- (S * norm.pdf(d1) * sigma) / (2 * np.sqrt(T)) + r * K * np.exp(-r * T) * norm.cdf(-d2)) / 365)
    put_rho = float(-K * T * np.exp(-r * T) * norm.cdf(-d2) / 100)

    return {
        "call": {
            "delta": call_delta,
            "gamma": gamma,
            "theta": call_theta,
            "vega": vega,
            "rho": call_rho
        },
        "put": {
            "delta": put_delta,
            "gamma": gamma,
            "theta": put_theta,
            "vega": vega,
            "rho": put_rho
        }
    }
