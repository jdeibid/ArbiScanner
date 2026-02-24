// ─── Platform configuration ───────────────────────────────────────────────────
// Add new platforms here; the rest of the code adapts automatically.
const PLATFORMS = {
    wally: {
        label: 'WallyTech',
        commission: 0.0299,   // 2.99%
        taxRate: 0.07,        // 7 % of commission (ITBMS)
        taxApplicable: false, // WallyTech does NOT charge the tax
        binanceRateKey: 'binanceWally',
    },
    zinli: {
        label: 'Zinli',
        commission: 0.0375,   // 3.75%
        taxRate: 0.07,        // 7 % of commission (ITBMS)
        taxApplicable: true,  // Zinli DOES charge the tax
        binanceRateKey: 'binanceZinli',
    },
};

// Card commission — not platform-specific
const CARD_COMM_RATE = 0.028; // 2.8%

// ─── Live rates (populated by fetchRates) ─────────────────────────────────────
let rates = {
    bcv: 0,
    binanceVes: 0,
    binanceWally: 0,
    binanceZinli: 0,
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    fetchRates();
    document.getElementById('calculate-btn').addEventListener('click', calculate);
    document.getElementById('platform').addEventListener('change', updateBinanceMarginDisplay);
});

// ─── Rate display helpers ──────────────────────────────────────────────────────
function updateBinanceMarginDisplay() {
    const platformKey = document.getElementById('platform').value;
    const platform = PLATFORMS[platformKey];
    const el = document.getElementById('binance-margin');
    if (el && platform) {
        el.textContent = `$${rates[platform.binanceRateKey]}`;
    }
}

async function fetchRates() {
    try {
        const res = await fetch('/api/rates');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        rates.bcv = data.bcv;
        rates.binanceVes = data.binanceVes;
        rates.binanceWally = data.binanceWally;
        rates.binanceZinli = data.binanceZinli;

        setText('bcv-rate', `Bs. ${fmt(rates.bcv, 2)}`);
        setText('binance-ves-rate', `Bs. ${fmt(rates.binanceVes, 2)}`);
        setText('binance-wallytech-rate', `$${fmt(rates.binanceWally, 4)}`);
        setText('binance-zinli-rate', `$${fmt(rates.binanceZinli, 4)}`);

        if (data.fetchedAt) {
            const timeStr = new Date(data.fetchedAt)
                .toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
            const el = document.getElementById('last-updated');
            if (el) el.textContent = `Actualizado: ${timeStr}`;
        }

        updateBinanceMarginDisplay();
    } catch (err) {
        console.error('Error fetching rates', err);
    }
}

// ─── Core calculation (pure) ───────────────────────────────────────────────────
/**
 * Runs all calculations from raw inputs.
 * Reads the DOM only for user inputs, then updates result elements.
 */
function calculate() {
    // 1. Read inputs
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const platformKey = document.getElementById('platform').value;
    const platform = PLATFORMS[platformKey];

    if (!platform) {
        console.warn(`Unknown platform: ${platformKey}`);
        return;
    }

    const margin = rates[platform.binanceRateKey];

    // 2. Pure calculations
    const platformComm = amount * platform.commission;
    const tax = platform.taxApplicable ? platformComm * platform.taxRate : 0;
    const cardComm = (amount + platformComm + tax) * CARD_COMM_RATE;
    const totalValue = amount + platformComm + tax + cardComm;

    // Net amount received in Binance (deduct Binance's ~$0.05 spread fee)
    const totalAmountBinance = margin > 0 ? (amount / margin) - 0.05 : 0;

    // Real yield per dollar invested
    const realAmount = totalValue > 0 ? totalAmountBinance / totalValue : 0;

    // Spread vs official rate
    const spread = (rates.binanceVes * realAmount) - rates.bcv;

    // Net in VES
    const totalProfit = (totalAmountBinance * parseFloat(rates.binanceVes.toFixed(2))) - 0.05;

    // BCV equivalent of the profit
    const bcvEquivalent = rates.bcv > 0 ? totalProfit / rates.bcv : 0;

    // Comparison: paying at BCV rate
    const bcvTotal = amount * rates.bcv;
    const binanceVesTotal = totalProfit > 0 ? bcvTotal / (totalProfit / amount) : 0;
    const binanceVesNet = (bcvTotal / rates.binanceVes) + 0.05;

    // 3. Write results to DOM (missing elements are silently skipped)
    setText('result-platform-comm', `$${fmt(platformComm, 2)}`);
    setText('result-tax', `$${fmt(tax, 2)}`);
    setText('result-card-comm', `$${fmt(cardComm, 2)}`);
    setText('result-total-value', `$${fmt(totalValue, 2)}`);
    setText('result-amount-binance', `$${fmt(totalAmountBinance, 2)}`);
    setText('result-real-amount', `${fmt(realAmount * 100, 2)}%`);
    setText('result-spread', `Bs. ${fmt(spread, 2)}`);
    setText('result-profit', `Bs. ${fmt(totalProfit, 2)}`);
    setText('bcv-equivalent', `$${fmt(bcvEquivalent, 2)}`);
    setText('bcv-total', `Bs. ${fmt(bcvTotal, 2)}`);
    setText('binance-ves-total', `$${fmt(binanceVesTotal, 2)}`);
    console.log(binanceVesNet);
    setText('binance-ves-net', `$${fmt(binanceVesNet, 2)}`);
}

// ─── Formatting helper ─────────────────────────────────────────────────────────
function fmt(value, decimals = 2) {
    return value.toLocaleString('es-VE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

// ─── Safe DOM write ────────────────────────────────────────────────────────────
// Silently skips if the element doesn't exist in the current HTML.
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
