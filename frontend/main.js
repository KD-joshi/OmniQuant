const presetSelect = document.getElementById('portfolio-preset');
const customTickersGroup = document.getElementById('custom-tickers-group');
const tickersInput = document.getElementById('tickers');
const investmentInput = document.getElementById('investment');
const durationVal = document.getElementById('duration-val');
const durationUnit = document.getElementById('duration-unit');
const durationWarning = document.getElementById('duration-warning');
const varSlider = document.getElementById('var-slider');
const varValueDisplay = document.getElementById('var-value-display');
const runBtn = document.getElementById('run-btn');

const btnCustomizeDist = document.getElementById('btn-customize-dist');
const customAmountsContainer = document.getElementById('custom-amounts-container');
const btnCancelCustomDist = document.getElementById('btn-cancel-custom-dist');
const currencySelect = document.getElementById('currency-select');

const loadingDiv = document.getElementById('loading');
const placeholder = document.getElementById('placeholder');
const resultsContainer = document.getElementById('results-container');

const expectedValueEl = document.getElementById('expected-value');
const varValueEl = document.getElementById('var-value');
const varConfidenceLabel = document.getElementById('var-confidence-label');
const advisorText = document.getElementById('advisor-text');

let simulationChart = null;

// Handle Preset Selection
presetSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        customTickersGroup.classList.remove('hidden');
    } else {
        customTickersGroup.classList.add('hidden');
        if (isCustomDistribution) {
            isCustomDistribution = false;
            tickersInput.classList.remove('hidden');
            btnCustomizeDist.classList.remove('hidden');
            customAmountsContainer.classList.add('hidden');
            btnCancelCustomDist.classList.add('hidden');
            investmentInput.readOnly = false;
            investmentInput.style.opacity = '1';
        }
        tickersInput.value = e.target.value;
    }
});

// Handle Duration Limits
const validateDuration = () => {
    let max = 3;
    if (durationUnit.value === 'months') max = 36;
    if (durationUnit.value === 'days') max = 756;
    
    durationVal.max = max;
    
    if (parseInt(durationVal.value) > max) {
        durationWarning.classList.remove('hidden');
        durationVal.value = max;
    } else {
        durationWarning.classList.add('hidden');
    }
};

durationVal.addEventListener('input', validateDuration);
durationUnit.addEventListener('change', validateDuration);

// Handle Slider
varSlider.addEventListener('input', (e) => {
    varValueDisplay.textContent = e.target.value;
});

// Format Currency
const formatCurrency = (val) => {
    const currency = currencySelect.value;
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency
    }).format(val);
};

let isCustomDistribution = false;

function recalculateTotalInvestment() {
    const amountInputs = customAmountsContainer.querySelectorAll('.custom-dist-amount');
    let total = 0;
    amountInputs.forEach(input => {
        const val = parseFloat(input.value);
        if (!isNaN(val)) total += val;
    });
    investmentInput.value = total;
}

function createTickerRow(tickerName, amount) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.marginBottom = '8px';
    row.className = 'custom-dist-row';

    const tickerInput = document.createElement('input');
    tickerInput.type = 'text';
    tickerInput.value = tickerName;
    tickerInput.className = 'custom-dist-ticker';
    tickerInput.placeholder = 'Ticker';
    tickerInput.style.flex = '1';

    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.value = amount;
    amountInput.className = 'custom-dist-amount';
    amountInput.min = '0';
    amountInput.placeholder = 'Amount';
    amountInput.style.flex = '1';
    
    amountInput.addEventListener('input', recalculateTotalInvestment);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'X';
    removeBtn.className = 'secondary-btn';
    removeBtn.style.padding = '0.5rem 0.75rem';
    removeBtn.style.background = 'rgba(239, 68, 68, 0.2)';
    removeBtn.style.borderColor = 'rgba(239, 68, 68, 0.5)';
    
    removeBtn.addEventListener('click', () => {
        row.remove();
        recalculateTotalInvestment();
    });

    row.appendChild(tickerInput);
    row.appendChild(amountInput);
    row.appendChild(removeBtn);
    return row;
}

btnCustomizeDist.addEventListener('click', () => {
    isCustomDistribution = true;
    tickersInput.classList.add('hidden');
    btnCustomizeDist.classList.add('hidden');
    customAmountsContainer.classList.remove('hidden');
    btnCancelCustomDist.classList.remove('hidden');
    investmentInput.readOnly = true;
    investmentInput.style.opacity = '0.7';

    customAmountsContainer.innerHTML = ''; // Clear
    
    const rawTickers = tickersInput.value;
    const tickers = rawTickers.split(',').map(t => t.trim().toUpperCase()).filter(t => t);
    
    const currentTotal = parseFloat(investmentInput.value) || 10000;
    const amountPerTicker = tickers.length > 0 ? (currentTotal / tickers.length).toFixed(2) : currentTotal;

    tickers.forEach(t => {
        customAmountsContainer.appendChild(createTickerRow(t, amountPerTicker));
    });

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = '+ Add Ticker';
    addBtn.className = 'secondary-btn';
    addBtn.style.width = '100%';
    addBtn.style.marginTop = '4px';
    addBtn.addEventListener('click', () => {
        customAmountsContainer.insertBefore(createTickerRow('', 0), addBtn);
    });
    customAmountsContainer.appendChild(addBtn);
    
    recalculateTotalInvestment();
});

btnCancelCustomDist.addEventListener('click', () => {
    isCustomDistribution = false;
    tickersInput.classList.remove('hidden');
    btnCustomizeDist.classList.remove('hidden');
    customAmountsContainer.classList.add('hidden');
    btnCancelCustomDist.classList.add('hidden');
    investmentInput.readOnly = false;
    investmentInput.style.opacity = '1';

    // Update comma-separated list from custom rows
    const tickerInputs = customAmountsContainer.querySelectorAll('.custom-dist-ticker');
    const newTickers = [];
    tickerInputs.forEach(input => {
        const val = input.value.trim().toUpperCase();
        if (val) newTickers.push(val);
    });
    if (newTickers.length > 0) {
        tickersInput.value = newTickers.join(', ');
    }
});

// Run Simulation
runBtn.addEventListener('click', async () => {
    let tickers = [];
    let tickerAmounts = null;

    if (isCustomDistribution) {
        tickerAmounts = {};
        const rows = customAmountsContainer.querySelectorAll('.custom-dist-row');
        rows.forEach(row => {
            const t = row.querySelector('.custom-dist-ticker').value.trim().toUpperCase();
            const a = parseFloat(row.querySelector('.custom-dist-amount').value);
            if (t && !isNaN(a)) {
                tickerAmounts[t] = a;
                tickers.push(t);
            }
        });
    } else {
        const rawTickers = tickersInput.value;
        tickers = rawTickers.split(',').map(t => t.trim().toUpperCase()).filter(t => t);
    }

    if (tickers.length === 0) {
        alert("Please enter at least one valid ticker.");
        return;
    }

    const investment = parseFloat(investmentInput.value);
    const confidence = parseInt(varSlider.value);
    const percentile = 100 - confidence; // e.g. 95 confidence -> 5th percentile
    
    let numDays = parseInt(durationVal.value);
    if (durationUnit.value === 'years') numDays *= 252;
    else if (durationUnit.value === 'months') numDays *= 21;

    if (numDays > 756) {
        alert("Strict Validation: Maximum simulation duration cannot exceed 3 years (756 days).");
        durationVal.value = 3;
        durationUnit.value = 'years';
        return;
    }

    // UI State
    runBtn.disabled = true;
    document.getElementById('simulated-tickers-display').textContent = tickers.join(', ');
    loadingDiv.classList.remove('hidden');
    placeholder.classList.add('hidden');
    resultsContainer.classList.add('hidden');

    try {
        const response = await fetch('/api/simulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tickers: tickers,
                ticker_amounts: tickerAmounts,
                initial_investment: investment,
                currency: currencySelect.value,
                var_percentile: percentile,
                num_days: numDays
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Simulation failed');
        }

        const data = await response.json();
        
        // Update DOM
        expectedValueEl.textContent = formatCurrency(data.expected_value);
        varValueEl.textContent = formatCurrency(data.custom_var_value);
        varConfidenceLabel.textContent = confidence;
        advisorText.textContent = data.advice;

        renderChart(data.sampled_paths, data.mean_path, data.worst_path, data.best_path, confidence);

        resultsContainer.classList.remove('hidden');

    } catch (error) {
        alert("Error: " + error.message);
        placeholder.classList.remove('hidden');
    } finally {
        runBtn.disabled = false;
        loadingDiv.classList.add('hidden');
    }
});

function renderChart(paths, meanPath, worstPath, bestPath, confidence) {
    const ctx = document.getElementById('simulationChart').getContext('2d');

    if (simulationChart) {
        simulationChart.destroy();
    }

    const numDays = paths.length; 
    const labels = Array.from({ length: numDays }, (_, i) => `Day ${i}`);

    // We get paths shape: [num_days][num_samples]
    const numSamples = paths[0].length;
    const datasets = [];

    // Background noise paths
    for (let s = 0; s < numSamples; s++) {
        const dataPoint = [];
        for (let d = 0; d < numDays; d++) {
            dataPoint.push(paths[d][s]);
        }
        datasets.push({
            label: `Sim ${s + 1}`,
            data: dataPoint,
            borderColor: 'rgba(255, 255, 255, 0.05)',
            borderWidth: 1,
            pointRadius: 0,
            pointHoverRadius: 0,
            pointHitRadius: 0,
            fill: false,
            tension: 0.1
        });
    }

    // Insightful thick paths
    datasets.push({
        label: `Best Case (Top ${100 - confidence}%)`,
        data: bestPath,
        borderColor: '#22c55e',
        borderWidth: 3,
        pointRadius: 0,
        fill: false,
        tension: 0.1
    });

    datasets.push({
        label: 'Expected (Mean) Path',
        data: meanPath,
        borderColor: '#f8fafc',
        borderDash: [5, 5],
        borderWidth: 3,
        pointRadius: 0,
        fill: false,
        tension: 0.1
    });

    datasets.push({
        label: `Worst Case (${confidence}% VaR)`,
        data: worstPath,
        borderColor: '#ef4444',
        borderWidth: 3,
        pointRadius: 0,
        fill: false,
        tension: 0.1
    });

    simulationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#94a3b8',
                        filter: function (item, chart) {
                            return item.text.includes('Case') || item.text.includes('Expected');
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    filter: function (tooltipItem) {
                        return tooltipItem.dataset.label.includes('Case') || tooltipItem.dataset.label.includes('Expected');
                    },
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', maxTicksLimit: 12 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        callback: function (value) {
                            if (value >= 1000) return '$' + (value / 1000).toFixed(1) + 'k';
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

// --- Tabs Logic ---
const tabs = {
    'portfolio': { btn: document.getElementById('tab-portfolio'), controls: document.getElementById('portfolio-controls'), main: document.getElementById('portfolio-main') },
    'options': { btn: document.getElementById('tab-options'), controls: document.getElementById('options-controls'), main: document.getElementById('options-main') },
    'ideas': { btn: document.getElementById('tab-ideas'), controls: document.getElementById('ideas-controls'), main: document.getElementById('ideas-main') }
};

function switchTab(tabId) {
    for (const [id, els] of Object.entries(tabs)) {
        if (id === tabId) {
            els.btn.classList.add('active');
            els.controls.classList.remove('hidden');
            els.main.classList.remove('hidden');
        } else {
            els.btn.classList.remove('active');
            els.controls.classList.add('hidden');
            els.main.classList.add('hidden');
        }
    }
}

tabs.portfolio.btn.addEventListener('click', () => switchTab('portfolio'));
tabs.options.btn.addEventListener('click', () => switchTab('options'));
tabs.ideas.btn.addEventListener('click', () => switchTab('ideas'));

// --- Options Logic ---
const runOptionsBtn = document.getElementById('run-options-btn');
const optionsPlaceholder = document.getElementById('options-placeholder');
const optionsResultsContainer = document.getElementById('options-results-container');

let optionsChart = null;
let currentPayoffData = null;
let currentPayoffView = 'combined';

const btnCall = document.getElementById('payoff-call-btn');
const btnPut = document.getElementById('payoff-put-btn');
const btnCombined = document.getElementById('payoff-combined-btn');

function updatePayoffButtons() {
    btnCall.className = currentPayoffView === 'call' ? 'primary-btn' : 'secondary-btn';
    btnPut.className = currentPayoffView === 'put' ? 'primary-btn' : 'secondary-btn';
    btnCombined.className = currentPayoffView === 'combined' ? 'primary-btn' : 'secondary-btn';
    
    [btnCall, btnPut, btnCombined].forEach(b => {
        b.style.padding = '0.4rem 1rem';
        b.style.fontSize = '0.85rem';
        if(b.className.includes('secondary-btn')) b.style.border = 'none';
        b.style.marginTop = '0';
    });
}

btnCall.addEventListener('click', () => { currentPayoffView = 'call'; updatePayoffButtons(); renderOptionsChart(); });
btnPut.addEventListener('click', () => { currentPayoffView = 'put'; updatePayoffButtons(); renderOptionsChart(); });
btnCombined.addEventListener('click', () => { currentPayoffView = 'combined'; updatePayoffButtons(); renderOptionsChart(); });

function renderOptionsChart() {
    if (!currentPayoffData) return;
    
    const ctx = document.getElementById('optionsChart').getContext('2d');
    if (optionsChart) {
        optionsChart.destroy();
    }
    
    const datasets = [];
    
    if (currentPayoffView === 'call' || currentPayoffView === 'combined') {
        datasets.push({
            label: 'Call Value (Today)',
            data: currentPayoffData.call_current,
            borderColor: '#38bdf8',
            borderWidth: 2,
            tension: 0.2,
            pointRadius: 0
        });
        datasets.push({
            label: 'Call Payoff (Expiry)',
            data: currentPayoffData.call_expiry,
            borderColor: '#38bdf8',
            borderDash: [5, 5],
            borderWidth: 2,
            tension: 0,
            pointRadius: 0
        });
    }
    
    if (currentPayoffView === 'put' || currentPayoffView === 'combined') {
        datasets.push({
            label: 'Put Value (Today)',
            data: currentPayoffData.put_current,
            borderColor: '#ef4444',
            borderWidth: 2,
            tension: 0.2,
            pointRadius: 0
        });
        datasets.push({
            label: 'Put Payoff (Expiry)',
            data: currentPayoffData.put_expiry,
            borderColor: '#ef4444',
            borderDash: [5, 5],
            borderWidth: 2,
            tension: 0,
            pointRadius: 0
        });
    }
    
    optionsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: currentPayoffData.s_range.map(v => formatOptCurrency(v)),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', callback: v => formatOptCurrency(v) } }
            },
            plugins: {
                legend: { labels: { color: '#94a3b8' } }
            }
        }
    });
}
const optTickerInput = document.getElementById('opt-ticker');
const optStrikeInput = document.getElementById('opt-strike');
const optDaysInput = document.getElementById('opt-days');
const optVolInput = document.getElementById('opt-vol');
const optCurrencySelect = document.getElementById('opt-currency-select');

const formatOptCurrency = (val) => {
    const currency = optCurrencySelect.value;
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency
    }).format(val);
};

runOptionsBtn.addEventListener('click', async () => {
    const ticker = optTickerInput.value.trim().toUpperCase();
    const strike = parseFloat(optStrikeInput.value);
    const days = parseInt(optDaysInput.value);
    const volInput = parseFloat(optVolInput.value);
    
    if (!ticker || isNaN(strike) || isNaN(days)) {
        alert("Please enter valid Ticker, Strike, and Days.");
        return;
    }
    
    const payload = {
        ticker: ticker,
        strike_price: strike,
        days_to_expiry: days
    };
    
    if (!isNaN(volInput)) {
        payload.volatility_override = volInput / 100.0;
    }
    
    runOptionsBtn.disabled = true;
    runOptionsBtn.textContent = 'Calculating...';
    
    try {
        const response = await fetch('/api/options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Error calculating options");
        }
        
        const data = await response.json();
        
        document.getElementById('opt-current-price').textContent = formatOptCurrency(data.current_price);
        document.getElementById('opt-current-vol').textContent = `${(data.calculated_volatility * 100).toFixed(2)}%`;
        
        document.getElementById('call-price-display').textContent = formatOptCurrency(data.call_price);
        document.getElementById('put-price-display').textContent = formatOptCurrency(data.put_price);
        
        document.getElementById('call-delta').textContent = data.greeks.call.delta.toFixed(4);
        document.getElementById('call-gamma').textContent = data.greeks.call.gamma.toFixed(4);
        document.getElementById('call-theta').textContent = data.greeks.call.theta.toFixed(4);
        document.getElementById('call-vega').textContent = data.greeks.call.vega.toFixed(4);
        
        document.getElementById('put-delta').textContent = data.greeks.put.delta.toFixed(4);
        document.getElementById('put-gamma').textContent = data.greeks.put.gamma.toFixed(4);
        document.getElementById('put-theta').textContent = data.greeks.put.theta.toFixed(4);
        document.getElementById('put-vega').textContent = data.greeks.put.vega.toFixed(4);
        
        currentPayoffData = data.payoff_data;
        updatePayoffButtons();
        renderOptionsChart();
        
        optionsPlaceholder.classList.add('hidden');
        optionsResultsContainer.classList.remove('hidden');
    } catch (error) {
        alert(error.message);
    } finally {
        runOptionsBtn.disabled = false;
        runOptionsBtn.textContent = 'Calculate Options Price';
    }
});

// --- AI Trade Ideas Logic ---
const runIdeasBtn = document.getElementById('run-ideas-btn');
const ideasTickersInput = document.getElementById('ideas-tickers');
const ideasLoading = document.getElementById('ideas-loading');
const ideasPlaceholder = document.getElementById('ideas-placeholder');
const ideasResultsContainer = document.getElementById('ideas-results-container');

runIdeasBtn.addEventListener('click', async () => {
    const rawTickers = ideasTickersInput.value.split(',').map(t => t.trim().toUpperCase()).filter(t => t.length > 0);
    
    if (rawTickers.length === 0) {
        alert("Please enter at least one ticker.");
        return;
    }
    
    ideasPlaceholder.classList.add('hidden');
    ideasResultsContainer.classList.add('hidden');
    ideasLoading.classList.remove('hidden');
    runIdeasBtn.disabled = true;
    runIdeasBtn.textContent = 'Scanning...';
    
    try {
        const response = await fetch('/api/trade_ideas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: rawTickers })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Error generating trade ideas");
        }
        
        const data = await response.json();
        const marketData = data.market_data;
        const aiAnalysis = data.ai_analysis;
        
        ideasResultsContainer.innerHTML = '';
        
        // Handle global disclaimer if present
        if (aiAnalysis.disclaimer) {
            ideasResultsContainer.innerHTML += `
                <div style="padding: 15px; margin-bottom: 20px; background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 8px;">
                    <p style="color: #fca5a5; font-size: 0.9rem; margin: 0;"><strong>Disclaimer:</strong> ${aiAnalysis.disclaimer}</p>
                </div>
            `;
        }
        
        for (const ticker of rawTickers) {
            if (!marketData[ticker] || !aiAnalysis[ticker]) continue;
            
            const stats = marketData[ticker];
            const ai = aiAnalysis[ticker];
            const curSym = (stats.currency && stats.currency.toUpperCase() === 'INR') ? '₹' : '$';
            
            const ratingColor = ai.stock_rating.toLowerCase() === 'buy' ? '#10b981' : (ai.stock_rating.toLowerCase() === 'sell' ? '#ef4444' : '#f59e0b');
            
            const card = document.createElement('div');
            card.className = 'card glass-panel';
            card.style.marginBottom = '20px';
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px; margin-bottom: 15px;">
                    <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        ${ticker}
                        <span style="font-size: 0.9rem; padding: 4px 10px; border-radius: 20px; background: ${ratingColor}20; color: ${ratingColor}; border: 1px solid ${ratingColor}50;">
                            ${ai.stock_rating.toUpperCase()}
                        </span>
                    </h2>
                    <div style="text-align: right; font-size: 0.9rem; color: #94a3b8;">
                        Price: ${curSym}${stats.current_price.toFixed(2)} | <a href="https://www.investopedia.com/terms/r/rsi.asp" target="_blank" style="color: #38bdf8; text-decoration: none; border-bottom: 1px dotted #38bdf8;">RSI</a>: ${stats.rsi_14.toFixed(2)} | <a href="https://www.investopedia.com/terms/v/volatility.asp" target="_blank" style="color: #38bdf8; text-decoration: none; border-bottom: 1px dotted #38bdf8;">Volatility</a>: ${(stats.volatility*100).toFixed(1)}%
                    </div>
                </div>
                
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 250px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
                        <h3 style="color: #e2e8f0; margin-bottom: 10px; font-size: 1.1rem;">📈 Stock Outlook</h3>
                        <p style="color: #94a3b8; line-height: 1.5; font-size: 0.95rem;">${ai.stock_thesis}</p>
                    </div>
                    
                    <div style="flex: 1; min-width: 250px; background: rgba(56, 189, 248, 0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.2);">
                        <h3 style="color: #38bdf8; margin-bottom: 10px; font-size: 1.1rem;">🎯 Options Play</h3>
                        <div style="font-weight: 600; color: #f8fafc; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            Strategy: ${ai.options_strategy}
                        </div>
                        <p style="color: #94a3b8; line-height: 1.5; font-size: 0.95rem; margin: 0;">${ai.options_thesis}</p>
                    </div>
                </div>
            `;
            ideasResultsContainer.appendChild(card);
        }
        
        ideasResultsContainer.classList.remove('hidden');
    } catch (error) {
        alert(error.message);
        ideasPlaceholder.classList.remove('hidden');
    } finally {
        ideasLoading.classList.add('hidden');
        runIdeasBtn.disabled = false;
        runIdeasBtn.textContent = 'Scan & Generate Ideas';
    }
});
