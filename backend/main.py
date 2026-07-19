from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import numpy as np
import os

from backend.monte_carlo import run_simulation, calculate_var
from backend.llm_advisor import get_advice

app = FastAPI(title="Monte Carlo Portfolio Simulator")

# Allow the frontend (Vite running on a different port) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from typing import Optional, Dict

class SimulationRequest(BaseModel):
    tickers: list[str]
    ticker_amounts: Optional[Dict[str, float]] = None
    currency: str = "USD"
    initial_investment: float = 10000.0
    num_simulations: int = 2000 # Reduced for faster web response
    num_days: int = 252
    var_percentile: float = 5.0 # E.g., 5.0 for 95% Confidence VaR

class OptionsRequest(BaseModel):
    ticker: str
    strike_price: float
    days_to_expiry: int
    volatility_override: Optional[float] = None
    risk_free_rate: float = 0.04

class TradeIdeasRequest(BaseModel):
    tickers: list[str]

from backend.scanner import scan_market
from backend.llm_advisor import generate_trade_ideas

@app.post("/api/trade_ideas")
def get_trade_ideas(req: TradeIdeasRequest):
    if not req.tickers:
        raise HTTPException(status_code=400, detail="Must provide at least one ticker.")
        
    try:
        market_data = scan_market(req.tickers)
        if not market_data:
            raise ValueError("Could not fetch valid market data for any provided tickers.")
            
        ideas = generate_trade_ideas(market_data)
        
        return {
            "market_data": market_data,
            "ai_analysis": ideas
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from backend.options_pricing import black_scholes_pricing, calculate_greeks
from backend.monte_carlo import fetch_data
import pandas as pd

@app.post("/api/options")
def calculate_options(req: OptionsRequest):
    try:
        prices = fetch_data([req.ticker])
        
        # Determine S (current price)
        if isinstance(prices, pd.DataFrame):
            S = float(prices.iloc[-1].iloc[0])
            returns = prices.iloc[:, 0].pct_change().dropna()
        else:
            S = float(prices.iloc[-1])
            returns = prices.pct_change().dropna()
            
        # Volatility
        sigma = req.volatility_override
        if sigma is None:
            sigma = float(returns.std() * np.sqrt(252))
            
        T = req.days_to_expiry / 365.0
        r = req.risk_free_rate
        K = req.strike_price
        
        call_price, put_price = black_scholes_pricing(S, K, T, r, sigma)
        greeks = calculate_greeks(S, K, T, r, sigma)
        
        # Calculate Payoff Data for Chart
        s_range = np.linspace(S * 0.8, S * 1.2, 50)
        payoff_data = {
            "s_range": [],
            "call_current": [],
            "call_expiry": [],
            "put_current": [],
            "put_expiry": []
        }
        for s_val in s_range:
            c, p = black_scholes_pricing(s_val, K, T, r, sigma)
            payoff_data["s_range"].append(float(s_val))
            payoff_data["call_current"].append(float(c))
            payoff_data["call_expiry"].append(max(0.0, float(s_val - K)))
            payoff_data["put_current"].append(float(p))
            payoff_data["put_expiry"].append(max(0.0, float(K - s_val)))
        
        return {
            "current_price": S,
            "calculated_volatility": sigma,
            "call_price": call_price,
            "put_price": put_price,
            "greeks": greeks,
            "payoff_data": payoff_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate")
def simulate(req: SimulationRequest):
    weights = None
    if req.ticker_amounts:
        req.tickers = list(req.ticker_amounts.keys())
        req.initial_investment = sum(req.ticker_amounts.values())
        if req.initial_investment > 0:
            weights = [req.ticker_amounts[t] / req.initial_investment for t in req.tickers]
            
    if not req.tickers:
        raise HTTPException(status_code=400, detail="Must provide at least one ticker.")
        
    try:
        # Run the math
        sims = run_simulation(
            tickers=req.tickers,
            initial_investment=req.initial_investment,
            num_simulations=req.num_simulations,
            num_days=req.num_days,
            weights=weights
        )
        
        # Calculate final metrics
        final_values = sims[-1, :]
        expected_value = float(np.mean(final_values))
        
        # Dynamic VaR based on user slider (e.g. 5 for 95%, 1 for 99%)
        custom_var = float(calculate_var(sims, req.var_percentile))
        
        # Sample paths for frontend charting (don't send all 2000)
        sampled_paths = sims[:, :50].tolist() 
        
        # Calculate statistical paths across ALL 2000 simulations for each day
        mean_path = np.mean(sims, axis=1).tolist()
        worst_path = np.percentile(sims, req.var_percentile, axis=1).tolist()
        best_path = np.percentile(sims, 100 - req.var_percentile, axis=1).tolist()
        
        # Get AI Advice
        advice = get_advice(
            tickers=req.tickers,
            initial_investment=req.initial_investment,
            expected_value=expected_value,
            var_custom=custom_var,
            var_percentile=req.var_percentile,
            currency=req.currency
        )
        
        return {
            "expected_value": expected_value,
            "custom_var_value": custom_var,
            "var_percentile_requested": req.var_percentile,
            "sampled_paths": sampled_paths,
            "mean_path": mean_path,
            "worst_path": worst_path,
            "best_path": best_path,
            "advice": advice
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Serve Frontend Statically ---
frontend_path = os.path.join(os.path.dirname(__file__), '..', 'frontend')

@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(frontend_path, 'index.html'))

app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
