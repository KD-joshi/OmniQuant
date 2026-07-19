# Monte Carlo Simulation Project Plan

This project is divided into two phases. We will start with the fundamental concepts to build strong intuition, and then transition to a real-world financial application involving stock portfolios. 

Since you plan to host the project eventually, all code will be written in standard Python scripts (`.py` files).

## Phase 1: Foundations of Monte Carlo

In this phase, we will write simple Python scripts to understand the core idea of Monte Carlo simulations: using randomness to solve deterministic problems.

### Proposed Projects for Phase 1:
1. **Estimating $\pi$ (`estimate_pi.py`)**: We will simulate throwing darts at a square board with a circle inscribed in it. By calculating the ratio of darts that fall inside the circle to the total darts thrown, we can approximate the value of $\pi$.
2. **Dice Game Simulation (`craps_sim.py`)**: We will simulate thousands of games of Craps to determine the statistical probability of winning, which helps in understanding the Law of Large Numbers and building intuition for probability distributions.

We will visualize the convergence of these simulations using `matplotlib` to see how adding more iterations improves the accuracy of our estimates.

## Phase 2: Portfolio Risk Assessment (Value at Risk)

Once the foundations are clear, we will move to a more advanced, real-world application. Before writing the code, we will briefly cover the necessary financial concepts:
- **Returns and Volatility**: How stocks move and how we measure their risk.
- **Correlation**: How different stocks move in relation to each other.
- **Geometric Brownian Motion (GBM)**: The standard mathematical model used to simulate stock prices.
- **Value at Risk (VaR)**: A metric used by banks and hedge funds to quantify the maximum expected loss over a given timeframe at a specific confidence level.

### Proposed Implementation for Phase 2:
1. **Data Gathering (`data_loader.py`)**: We will fetch historical stock data (e.g., using the `yfinance` library) for a hypothetical portfolio (e.g., AAPL, MSFT, GOOGL).
2. **Parameter Estimation (`params.py`)**: We will calculate the historical mean returns, volatility, and the correlation matrix of the portfolio.
3. **Simulation (`var_sim.py`)**: We will use the Cholesky decomposition and Geometric Brownian Motion to simulate thousands of possible future price paths for the next year.
4. **Risk Analysis**: We will plot the distribution of final portfolio values and calculate the 95% and 99% Value at Risk (VaR).

## Verification Plan
- **Phase 1**: Ensure our estimation of $\pi$ converges to ~3.14159, and the Craps probability converges to ~49.3%.
- **Phase 2**: Ensure the simulated portfolio paths look realistic (random walks) and the VaR numbers align with typical market risks.
