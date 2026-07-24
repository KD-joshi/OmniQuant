import os
import google.generativeai as genai
from dotenv import load_dotenv
import json
from groq import Groq

# Load environment variables from .env
load_dotenv()

def get_advice(tickers, initial_investment, expected_value, var_custom, var_percentile, currency="USD"):
    """
    Uses the Gemini API to provide a short, personalized advisory message
    based on the Monte Carlo simulation results.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        
    if not api_key:
        return (
            "We noticed you haven't provided a GEMINI_API_KEY in your Render environment variables. "
            "Please set it so our AI Advisor can analyze your specific "
            "Value at Risk (VaR) against your expected returns to provide personalized insights!"
        )
        
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-3.5-flash")
    
    confidence = 100 - var_percentile
    
    symbol = "₹" if currency == "INR" else "$"
    
    prompt = f"""
    You are a financial advisor looking at a client's Monte Carlo simulation results.
    
    Portfolio: {', '.join(tickers)}
    Initial Investment: {symbol}{initial_investment:,.2f}
    Expected Value after 1 Year: {symbol}{expected_value:,.2f}
    {confidence}% Confidence Worst Case (VaR): {symbol}{var_custom:,.2f}
    
    Provide a short, insightful 2-paragraph summary (under 100 words) explaining to the user what these numbers mean.
    Tell them if their risk (VaR) seems high or low compared to their expected reward.
    Keep the tone professional, and slightly cautious (remind them simulations are not guarantees but a good way to quantify risk and make informed decisions).
    Do not use markdown formatting like bolding or headers, just plain text.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Could not generate advice at this time. Error: {str(e)}"

def get_gemini_ideas(market_data: dict, prompt: str):
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not set in .env")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        "gemini-3.5-flash",
        generation_config={"response_mime_type": "application/json"}
    )
    response = model.generate_content(prompt)
    return json.loads(response.text)

def get_groq_ideas(market_data: dict, prompt: str):
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set in .env")
    
    client = Groq(api_key=api_key)
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a quantitative financial analyst that only outputs valid JSON."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        model="llama3-8b-8192", 
        response_format={"type": "json_object"}
    )
    return json.loads(chat_completion.choices[0].message.content)

def get_algorithmic_ideas(market_data: dict):
    result = {}
    for ticker, data in market_data.items():
        rsi = data.get("rsi_14", 50)
        macd = data.get("macd", 0)
        signal = data.get("macd_signal", 0)
        price = data.get("current_price", 0)
        sma_50 = data.get("sma_50", 0)
        
        # Case A: Strong Buy
        if rsi < 45 and macd > signal and price > sma_50:
            rating = "Buy"
            stock_thesis = f"The stock is relatively cheap (RSI {rsi:.1f}) and momentum has shifted upwards (MACD > Signal). The long-term trend remains intact above the 50-day moving average."
            opt_strat = "Buy a 30-day Call"
            opt_thesis = "With upward momentum confirmed, a 30-day Call leverages the expected bounce while minimizing long-term theta decay."
        
        # Case B: Strong Sell
        elif rsi > 55 and macd < signal and price < sma_50:
            rating = "Sell"
            stock_thesis = f"The stock is elevated (RSI {rsi:.1f}) and momentum is breaking downwards (MACD < Signal). The price has fallen below the 50-day moving average, signaling weakness."
            opt_strat = "Buy a 30-day Put"
            opt_thesis = "Downward momentum is accelerating; a 30-day Put captures the downside risk while the short-term trend plays out."
            
        # Case C: Hold
        else:
            rating = "Hold"
            stock_thesis = f"The stock is currently showing mixed signals (RSI {rsi:.1f}, MACD vs Signal is inconclusive or trend is sideways). Best to wait for a clearer setup."
            opt_strat = "Avoid options"
            opt_thesis = "Without a clear directional edge, buying options is too risky due to time decay. Consider selling covered calls if you hold 100 shares."
            
        result[ticker] = {
            "stock_rating": rating,
            "stock_thesis": stock_thesis,
            "options_strategy": opt_strat,
            "options_thesis": opt_thesis
        }
    
    result["disclaimer"] = "This is a quantitative prediction based on past performance. Take the risk accordingly."
    return result

def generate_trade_ideas(market_data: dict):
    prompt = f"""
    You are an expert quantitative financial analyst and options strategist.
    I am providing you with live technical indicators for a basket of stocks.
    
    Market Data:
    {json.dumps(market_data, indent=2)}
    
    Analyze the data for EACH stock and return a JSON object where the keys are the tickers and the values are objects with these EXACT keys:
    - "stock_rating": "Buy", "Hold", or "Sell"
    - "stock_thesis": A 2-sentence explanation of the rating based heavily on the RSI, MACD, and Momentum data provided.
    - "options_strategy": A specific actionable strategy (e.g., "Buy a 30-day Call", "Buy a 90-day Put", or "Avoid options").
    - "options_thesis": A 1-sentence explanation of why that options duration and direction makes sense given the stock's volatility and trend.
    
    Include a disclaimer at the very end in a top-level key called "disclaimer" stating exactly: "This is a quantitative prediction based on past performance. Take the risk accordingly."
    """
    
    print("Attempting Gemini AI...")
    try:
        return get_gemini_ideas(market_data, prompt)
    except Exception as e1:
        print(f"Gemini failed: {e1}. Falling back to Groq AI...")
        try:
            return get_groq_ideas(market_data, prompt)
        except Exception as e2:
            print(f"Groq failed: {e2}. Falling back to Algorithmic Engine...")
            return get_algorithmic_ideas(market_data)
